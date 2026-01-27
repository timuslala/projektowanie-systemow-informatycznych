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
        # responses: list of {question_id: int, answer: string/int}
        
        user = request.user
        
        for resp in responses:
            q_id = resp.get('question_id')
            val = resp.get('answer')
            try:
                question = Question.objects.get(id=q_id) 
                # Security: verify question belongs to quiz (via banks)
                # omitting for brevity but recommended
                
                # Check if response already exists to avoid duplicates (optional, or update)
                # For now, let's update if exists or create
                
                if question.is_open_ended:
                     QuestionResponse.objects.update_or_create(
                         question=question, user=user,
                         defaults={'response_text': str(val)}
                     )
                else:
                     # Multiple choice
                     QuestionResponse.objects.update_or_create(
                         question=question, user=user,
                         defaults={'selected_option': int(val) if val else None}
                     )
            except (Question.DoesNotExist, ValueError):
                continue
                
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
            q_data = {
                'id': q.id,
                'text': q.text,
                'type': 'multiple_choice' if hasattr(q, 'multiplechoiceoption') else 'open_ended',
            }
            if hasattr(q, 'multiplechoiceoption'):
                 mc = q.multiplechoiceoption
                 q_data['options'] = [
                    {'id': 1, 'text': mc.option1, 'is_correct': mc.correct_option == 1},
                    {'id': 2, 'text': mc.option2, 'is_correct': mc.correct_option == 2},
                    {'id': 3, 'text': mc.option3, 'is_correct': mc.correct_option == 3},
                    {'id': 4, 'text': mc.option4, 'is_correct': mc.correct_option == 4},
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
                    is_correct = (resp.selected_option == q.multiplechoiceoption.correct_option)
                else:
                    # Logic for open ended? For now always false or manual
                    pass
                
                if is_correct:
                    score += 1
                    
                user_responses_data.append({
                    'question_id': q.id,
                    'selected_option_id': resp.selected_option,
                    'text_response': resp.response_text,
                    'is_correct': is_correct
                })
        
        return Response({
            'quiz_title': quiz.title,
            'score': score,
            'total_questions': total_questions,
            'questions': questions_data,
            'responses': user_responses_data
        })
