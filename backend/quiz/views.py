from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication
from common.swagger_utils import swagger_tags
from .models import Quiz
from .serializers import QuizSerializer, QuestionSerializer
from question.models import Question
from questionresponse.models import QuestionResponse
import random

@swagger_tags(tags=["quizzes"])
class QuizViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated] # Adjust permissions as needed
    queryset = Quiz.objects.all()
    serializer_class = QuizSerializer

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Quiz.objects.none()
        
        queryset = Quiz.objects.all()

        # Teachers see quizzes for their courses
        # Students see quizzes for courses they are enrolled in
        if user.is_staff:
            pass # Staff (admins) can see all quizzes
        elif getattr(user, 'is_teacher', False):
             queryset = queryset.filter(course__instructor=user)
        else:
             # For students, we need to filter by enrollment
             queryset = queryset.filter(course__courseprogress__user=user)

        course_id = self.request.query_params.get('course_id')
        if course_id:
            queryset = queryset.filter(course_id=course_id)
            
        return queryset

    @action(detail=True, methods=['get'])
    def questions(self, request, pk=None):
        quiz = self.get_object()
        questions = []
        for bank in quiz.question_banks.all():
            # Polymorphic query if possible, or just Question objects
            # To get specific types (MultipleChoice), we iterate
            qs = bank.questions.all()
            for q in qs:
                # Basic select_related/prefetch might be needed for optimization
                # But for now simple loop
                if hasattr(q, 'multiplechoiceoption'):
                    questions.append(q.multiplechoiceoption)
                else:
                    questions.append(q)
        
        if quiz.randomize_question_order:
            random.shuffle(questions)
            
        serializer = QuestionSerializer(questions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        quiz = self.get_object()
        responses = request.data.get('responses', [])
        # responses: list of {question_id: int, answer: string/int/list[int]}
        
        user = request.user
        
        all_questions = []
        for bank in quiz.question_banks.all():
            all_questions.extend(bank.questions.all())

        # Map provided responses by question_id
        submission_map = {r.get('question_id'): r.get('answer') for r in responses}

        for question in all_questions:
            val = submission_map.get(question.id)
            
            # Determine defaults based on input type and value
            defaults = {}
            if question.is_open_ended:
                defaults['response_text'] = str(val) if val is not None else ""
            else:
                 # Check if it's a multiple-select question
                if isinstance(val, list):
                    defaults['selected_options'] = val
                    defaults['selected_option'] = None
                else:
                    # Single select
                    defaults['selected_option'] = int(val) if val is not None else None
                    defaults['selected_options'] = []

            QuestionResponse.objects.update_or_create(
                question=question, user=user,
                defaults=defaults
            )

        return Response({'status': 'submitted'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def review(self, request, pk=None):
        quiz = self.get_object()
        user = request.user
        
        is_instructor = user.is_staff or getattr(user, 'is_teacher', False)
        
        # Check permissions logic
        if not is_instructor:
             # Student logic
             question_ids = set()
             for bank in quiz.question_banks.all():
                 question_ids.update(bank.questions.values_list('id', flat=True))
             
             if not question_ids:
                 return Response({"error": "Quiz has no questions."}, status=404)
                 
             has_responses = QuestionResponse.objects.filter(user=user, question_id__in=question_ids).exists()
             
             if not has_responses:
                 return Response({"error": "You must complete the quiz first."}, status=status.HTTP_403_FORBIDDEN)
                 
             if not quiz.show_correct_answers_on_completion:
                 return Response({"error": "Review not allowed for this quiz."}, status=status.HTTP_403_FORBIDDEN)
        
        # Collect data
        # Questions
        questions = []
        for bank in quiz.question_banks.all():
            questions.extend(bank.questions.all())
            
        # Responses
        # We need to fetch all responses for these questions for this user
        question_ids = [q.id for q in questions]
        responses_qs = QuestionResponse.objects.filter(user=user, question_id__in=question_ids)
        responses_map = {r.question_id: r for r in responses_qs}
        
        questions_data = []
        user_responses_data = []
        score = 0
        total_questions = len(questions)
        
        for q in questions:
            # Build Question Data
            # Determine type matching QuestionSerializer logic
            q_type = 'open'
            if hasattr(q, 'multiplechoiceoption'):
                if q.multiplechoiceoption.is_multiple_choice:
                    q_type = 'multiple_choice'
                else:
                    q_type = 'single_choice'

            q_data = {
                'id': q.id,
                'text': q.text,
                'type': q_type,
            }
            if hasattr(q, 'multiplechoiceoption'):
                 mc = q.multiplechoiceoption
                 is_mc = mc.is_multiple_choice
                 def check_correct(idx):
                     if is_mc and mc.correct_options:
                         return idx in mc.correct_options
                     return mc.correct_option == idx

                 q_data['options'] = [
                    {'id': 1, 'text': mc.option1, 'is_correct': check_correct(1)},
                    {'id': 2, 'text': mc.option2, 'is_correct': check_correct(2)},
                    {'id': 3, 'text': mc.option3, 'is_correct': check_correct(3)},
                    {'id': 4, 'text': mc.option4, 'is_correct': check_correct(4)},
                 ]
            else:
                # Open ended - might not have "correct answer" easily checkable automatically without more fields
                # Assuming no auto-check for open ended yet in this scope unless generic "completed" is enough
                q_data['correct_answer'] = "To do: model override" 
            
            questions_data.append(q_data)
            
            # Build Response Data
            resp = responses_map.get(q.id)
            is_correct = False
            if resp:
                if hasattr(q, 'multiplechoiceoption'):
                    if q.multiplechoiceoption.is_multiple_choice:
                        # Compare sets of indices
                        user_selected = set(resp.selected_options) if resp.selected_options else set()
                        correct_selected = set(q.multiplechoiceoption.correct_options) if q.multiplechoiceoption.correct_options else set()
                        is_correct = (user_selected == correct_selected)
                    else:
                        is_correct = (resp.selected_option == q.multiplechoiceoption.correct_option)
                else:
                    # Logic for open ended? For now always false or manual
                    pass
                
                # Basic auto-grading if points not set manually
                points = resp.points
                if points == 0 and is_correct:
                    points = 1
                
                score += points
                
                user_responses_data.append({
                    'response_id': resp.id,
                    'question_id': q.id,
                    'selected_option_id': resp.selected_option,
                    'selected_options': resp.selected_options,
                    'text_response': resp.response_text,
                    'is_correct': is_correct,
                    'points': points,
                    'instructor_comment': resp.instructor_comment
                })
        
        return Response({
            'quiz_title': quiz.title,
            'student_name': f"{user.name} {user.surname}",
            'score': score,
            'total_questions': total_questions,
            'questions': questions_data,
            'responses': user_responses_data
        })
    @action(detail=True, methods=['get'])
    def submissions(self, request, pk=None):
        """
        Get list of students who have submitted answers for this quiz.
        Returns: [ {user_id, name, email, submission_date (if tracked), score (auto)} ]
        """
        quiz = self.get_object()
        user = request.user
        
        # Permission check: must be instructor
        is_instructor = user.is_staff or getattr(user, 'is_teacher', False)
        if not is_instructor:
             return Response({"error": "Only instructors can view submissions."}, status=status.HTTP_403_FORBIDDEN)
             
        # Get all question IDs in this quiz
        question_ids = set()
        for bank in quiz.question_banks.all():
            question_ids.update(bank.questions.values_list('id', flat=True))
            
        if not question_ids:
            return Response([])

        # Find all responses for these questions
        responses = QuestionResponse.objects.filter(question_id__in=question_ids).select_related('user')
        
        # Group by user
        users_map = {}
        for r in responses:
            if r.user_id not in users_map:
                users_map[r.user_id] = {
                    'user_id': r.user.id,
                    'name': f"{r.user.name} {r.user.surname}",
                    'email': r.user.email,
                    # We could calculate preliminary score here
                }
        
        return Response(list(users_map.values()))

    @action(detail=True, methods=['get'], url_path='submissions/(?P<user_id>[^/.]+)')
    def student_submission(self, request, pk=None, user_id=None):
        """
        Get detailed submission for a specific student.
        Reuses review logic but for any user (teacher only).
        """
        quiz = self.get_object()
        requesting_user = request.user
        
        is_instructor = requesting_user.is_staff or getattr(requesting_user, 'is_teacher', False)
        if not is_instructor:
             return Response({"error": "Only instructors can view student submissions."}, status=status.HTTP_403_FORBIDDEN)
        
        # Target user
        from user.models import User
        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
             return Response({"error": "User not found"}, status=404)

        # Collect data (similar to review)
        questions = []
        for bank in quiz.question_banks.all():
            questions.extend(bank.questions.all())
            
        question_ids = [q.id for q in questions]
        responses_qs = QuestionResponse.objects.filter(user=target_user, question_id__in=question_ids)
        responses_map = {r.question_id: r for r in responses_qs}
        
        questions_data = []
        user_responses_data = []
        score = 0
        total_questions = len(questions)
        
        for q in questions:
            # Determine type matching QuestionSerializer logic
            q_type = 'open'
            if hasattr(q, 'multiplechoiceoption'):
                if q.multiplechoiceoption.is_multiple_choice:
                    q_type = 'multiple_choice'
                else:
                    q_type = 'single_choice'

            q_data = {
                'id': q.id,
                'text': q.text,
                'type': q_type,
            }
            if hasattr(q, 'multiplechoiceoption'):
                 mc = q.multiplechoiceoption
                 is_mc = mc.is_multiple_choice
                 def check_correct(idx):
                     if is_mc and mc.correct_options:
                         return idx in mc.correct_options
                     return mc.correct_option == idx

                 q_data['options'] = [
                    {'id': 1, 'text': mc.option1, 'is_correct': check_correct(1)},
                    {'id': 2, 'text': mc.option2, 'is_correct': check_correct(2)},
                    {'id': 3, 'text': mc.option3, 'is_correct': check_correct(3)},
                    {'id': 4, 'text': mc.option4, 'is_correct': check_correct(4)},
                 ]
            else:
                q_data['correct_answer'] = "Open ended question" 
            
            questions_data.append(q_data)
            
            resp = responses_map.get(q.id)
            
            # If response is missing (e.g. skipped or old submission logic), create an empty one so it can be graded
            if not resp:
                resp = QuestionResponse.objects.create(question=q, user=target_user)

            is_correct = False
            points = 0
            instructor_comment = None
            
            if resp:
                # Use stored points if available, otherwise calculate for MC
                points = resp.points
                instructor_comment = resp.instructor_comment
                
                if hasattr(q, 'multiplechoiceoption'):
                    if q.multiplechoiceoption.is_multiple_choice:
                        user_selected = set(resp.selected_options) if resp.selected_options else set()
                        correct_selected = set(q.multiplechoiceoption.correct_options) if q.multiplechoiceoption.correct_options else set()
                        is_correct_calc = (user_selected == correct_selected)
                    else:
                        is_correct_calc = (resp.selected_option == q.multiplechoiceoption.correct_option)
                    # If points are 0 and it's correct, maybe we should auto-calc visual "is_correct" flag?
                    # The teacher can override points.
                    is_correct = is_correct_calc
                
                score += points # Summing up stored points
                    
                user_responses_data.append({
                    'response_id': resp.id, # Needed for grading
                    'question_id': q.id,
                    'selected_option_id': resp.selected_option,
                    'selected_options': resp.selected_options, # Add this for frontend
                    'text_response': resp.response_text,
                    'is_correct': is_correct,
                    'points': points,
                    'instructor_comment': instructor_comment
                })
        
        return Response({
            'quiz_title': quiz.title,
            'student_name': f"{target_user.name} {target_user.surname}",
            'score': score,
            'total_questions': total_questions,
            'questions': questions_data,
            'responses': user_responses_data
        })

    @action(detail=False, methods=['post'], url_path='grade_response/(?P<response_id>[^/.]+)')
    def grade_response(self, request, response_id=None):
        """
        Update points and comment for a specific response.
        """
        user = request.user
        is_instructor = user.is_staff or getattr(user, 'is_teacher', False)
        if not is_instructor:
             return Response({"error": "Only instructors can grade."}, status=status.HTTP_403_FORBIDDEN)
             
        try:
            response = QuestionResponse.objects.get(id=response_id)
        except QuestionResponse.DoesNotExist:
            return Response({"error": "Response not found"}, status=404)
            
        # Optional: Verify that the response belongs to a quiz this instructor owns
        # response.question -> bank -> quiz -> course -> instructor == user
        
        points = request.data.get('points')
        comment = request.data.get('comment')
        
        if points is not None:
            response.points = points
        if comment is not None:
            response.instructor_comment = comment
            
        response.save()
        
        return Response({'status': 'graded', 'id': response.id, 'points': response.points})
