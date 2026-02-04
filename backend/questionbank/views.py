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
            q_type = q_data.get("type", "open")
            text = q_data.get("text")
            tags = q_data.get("tags", "")

            if q_type == "closed" or q_type == "multiple_choice":
                options = q_data.get("options", [])
                is_multiple_choice = q_data.get("isMultipleChoice", False)
                
                # Ensure 4 options
                opts = (options + [""] * 4)[:4]
                
                # Frontend sends 0-based indices
                correct_idx = q_data.get("correctOption", 0)
                correct_options_list = q_data.get("correctOptions", [])  # List of 0-based indices

                mco = MultipleChoiceOption.objects.create(
                    text=text,
                    tags=tags,
                    is_open_ended=False,
                    option1=opts[0],
                    option2=opts[1],
                    option3=opts[2],
                    option4=opts[3],
                    correct_option=(int(correct_idx) + 1) if not is_multiple_choice else 1,
                    is_multiple_choice=is_multiple_choice,
                    correct_options=[i + 1 for i in correct_options_list] if is_multiple_choice else []
                )
                question_bank.questions.add(mco)
            else:
                q = Question.objects.create(
                    text=text,
                    tags=tags,
                    is_open_ended=True
                )
                question_bank.questions.add(q)

        return question_bank



class QuestionBankViewSet(ModelViewSet):
    swagger_tags = ["question_banks"]
    authentication_classes = [JWTAuthentication]
    serializer_class = QuestionBankSerializer
    permission_classes = [IsInstructor | IsAdminUser]
    lookup_url_kwarg = "question_bank_id"

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
