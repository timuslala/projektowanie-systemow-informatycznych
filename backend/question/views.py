from common.permissions import IsInstructor
from rest_framework import viewsets, permissions, filters
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend, FilterSet, CharFilter
from .models import Question, MultipleChoiceOption
from quiz.serializers import FullQuestionSerializer
from questionbank.models import QuestionBank

class QuestionPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

class QuestionFilter(FilterSet):
    tags = CharFilter(lookup_expr='icontains')

    class Meta:
        model = Question
        fields = ['question_banks', 'is_open_ended']

class QuestionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing questions.
    Supports filtering by tags and search text.
    """
    queryset = Question.objects.all()
    serializer_class = FullQuestionSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated, IsInstructor]
    pagination_class = QuestionPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['text', 'tags']
    filterset_class = QuestionFilter

    def get_queryset(self):
        # Optionally filter by user permissions if needed.
        # For now, allow viewing all questions (as they are reusable).
        return Question.objects.all()

    def perform_create(self, serializer):
        # Handle polymorphic creation if needed or just standard save
        # serializer.save() works for Question fields.
        # But we need to handle MultipleChoiceOption creation if type is 'closed'
        # The serializer from quiz.serializers is read-only for options (SerializerMethodField).
        # We need a writeable serializer or handle it here.
        
        data = self.request.data
        q_type = data.get('type', 'open') # 'open' or 'closed' (or 'multiple_choice')
        
        # If we use QuestionSerializer, it might not validate 'options' because it's ReadOnly.
        # So we might need to manually extract them.
        
        text = data.get('text')
        tags = data.get('tags', '')
        bank_id = data.get('question_bank')
        
        bank = None
        if bank_id:
            try:
                bank = QuestionBank.objects.get(id=bank_id)
            except QuestionBank.DoesNotExist:
                pass
        
        if q_type == 'closed' or q_type == 'multiple_choice':
            options = data.get('options', [])
            is_multiple_choice = data.get('isMultipleChoice', False)
            
             # Ensure 4 options
            opts = (options + [""] * 4)[:4]
            
            # Frontend sends 0-based indices
            correct_idx = data.get('correctOption', 0) 
            correct_options_list = data.get('correctOptions', []) # List of 0-based indices
            
            mco = MultipleChoiceOption.objects.create(
                text=text,
                tags=tags,
                is_open_ended=False,
                option1=opts[0],
                option2=opts[1],
                option3=opts[2],
                option4=opts[3],
                correct_option=(int(correct_idx) + 1) if not is_multiple_choice else 1, # Default to 1 if multiple choice, field is required
                is_multiple_choice=is_multiple_choice,
                correct_options=[i + 1 for i in correct_options_list] if is_multiple_choice else []
            )
            if bank:
                bank.questions.add(mco)
        else:
            q = Question.objects.create(
                text=text,
                tags=tags,
                is_open_ended=True
            )
            if bank:
                bank.questions.add(q)


    def perform_update(self, serializer):
        instance = serializer.instance
        data = self.request.data
        
        # Update common fields
        instance.text = data.get('text', instance.text)
        instance.tags = data.get('tags', instance.tags)
        instance.save()
        
        # Handle MultipleChoiceOption
        if hasattr(instance, 'multiplechoiceoption'):
            mco = instance.multiplechoiceoption
            
            # Update options if provided
            options = data.get('options')
            if options:
                opts = (options + [""] * 4)[:4]
                mco.option1 = opts[0]
                mco.option2 = opts[1]
                mco.option3 = opts[2]
                mco.option4 = opts[3]
            
            # Update correct option/s
            is_multiple_choice = data.get('isMultipleChoice')
            if is_multiple_choice is not None:
                 mco.is_multiple_choice = is_multiple_choice
            
            # If switching/staying in multiple choice
            if mco.is_multiple_choice:
                 correct_options_list = data.get('correctOptions')
                 if correct_options_list is not None:
                     mco.correct_options = [i + 1 for i in correct_options_list]
                 # Default correct_option to 1 as fallback required field
                 mco.correct_option = 1
            else:
                 # Single choice
                 correct_idx = data.get('correctOption')
                 if correct_idx is not None:
                     mco.correct_option = int(correct_idx) + 1
                 mco.correct_options = []
            
            mco.save()

