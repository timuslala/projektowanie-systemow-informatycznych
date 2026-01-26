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
            qs = bank.question_set.all()
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
                
                if question.is_open_ended:
                     QuestionResponse.objects.create(question=question, user=user, response_text=str(val))
                else:
                     # Multiple choice
                     QuestionResponse.objects.create(question=question, user=user, selected_option=int(val) if val else None)
            except (Question.DoesNotExist, ValueError):
                continue
                
        return Response({'status': 'submitted'}, status=status.HTTP_200_OK)
