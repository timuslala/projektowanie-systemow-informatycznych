from rest_framework import serializers, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.serializers import ModelSerializer, SerializerMethodField
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication

from common.permissions import IsInstructor
from question.models import MultipleChoiceOption, Question
from quiz.serializers import QuestionSerializer, FullQuestionSerializer

from .models import QuestionBank


class QuestionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


class QuestionBankSerializer(ModelSerializer):
    number_of_questions = SerializerMethodField()
    questions = SerializerMethodField()

    class Meta:
        model = QuestionBank
        fields = ["id", "title", "number_of_questions", "questions"]
        read_only_fields = ["id", "number_of_questions"]

    def get_number_of_questions(self, obj):
        return obj.questions.count()

    def get_questions(self, obj):
        return []

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["questions"] = serializers.ListField(
            child=serializers.DictField(), write_only=True, required=False
        )

    def create(self, validated_data):
        questions_data = validated_data.pop("questions", [])
        question_bank = QuestionBank.objects.create(**validated_data)

        for q_data in questions_data:
            q_type = q_data.get("type")
            text = q_data.get("text")

            if q_type == "open":
                q = Question.objects.create(
                    text=text, is_open_ended=True
                )
                question_bank.questions.add(q)
            elif q_type == "closed":
                options = q_data.get("options", [])
                correct_option_idx = q_data.get("correctOption", 0)  # 0-based index
                opts = (options + ["]"] * 4)[:4]

                mco = MultipleChoiceOption.objects.create(
                    text=text,
                    is_open_ended=False,
                    option1=opts[0],
                    option2=opts[1],
                    option3=opts[2],
                    option4=opts[3],
                    correct_option=correct_option_idx + 1,  # Model uses 1-based
                )
                question_bank.questions.add(mco)

        return question_bank



class QuestionBankViewSet(ModelViewSet):
    swagger_tags = ["question_banks"]
    authentication_classes = [JWTAuthentication]
    serializer_class = QuestionBankSerializer
    permission_classes = [IsInstructor | IsAdminUser]
    lookup_url_kwarg = "question_bank_id"
    pagination_class = QuestionPagination

    def get_queryset(self):
        question_bank_id = self.kwargs.get("question_bank_id")
        if self.request.user.is_superuser:
            qbs = QuestionBank.objects.all()
        else:  # is instructor
            qbs = QuestionBank.objects.filter(user=self.request.user)
        if question_bank_id:
            qbs = qbs.filter(id=question_bank_id)
        return qbs

    def perform_create(self, serializer):
        return serializer.save(user=self.request.user)

    @action(detail=True, methods=["get"])
    def questions(self, request, question_bank_id=None):
        bank = self.get_object()
        questions = bank.questions.all()
        serializer = FullQuestionSerializer(questions, many=True)
        return Response(serializer.data)
