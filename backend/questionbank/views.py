from rest_framework import serializers
from rest_framework.permissions import IsAdminUser
from rest_framework.serializers import ModelSerializer, SerializerMethodField
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication

from common.permissions import IsInstructor
from question.models import MultipleChoiceOption, Question



from .models import QuestionBank


class QuestionBankSerializer(ModelSerializer):
    number_of_questions = SerializerMethodField()
    questions = SerializerMethodField()

    class Meta:
        model = QuestionBank
        fields = ["id", "title", "number_of_questions", "questions"]
        read_only_fields = ["id", "number_of_questions"]

    def get_number_of_questions(self, obj):
        return obj.question_set.count()

    def get_questions(self, obj):
        # We don't necessarily need to return full questions here for the list view,
        # but if we did, we'd need a QuestionSerializer.
        # For now, let's just make it write_only effectively by not returning much or handling it
        # Actually, let's make it write_only in the field definition by using `initial` or custom handling
        # But simpler: explicit field definition
        return []

    def to_internal_value(self, data):
        # Allow 'questions' to pass through to validated_data even if not in fields/model directly (as write_only)
        # But better to try standard DRF way first.
        # Let's override the class field definition instead of MethodField for input.
        return super().to_internal_value(data)

    # Redefine to accept input
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
                Question.objects.create(
                    question_bank=question_bank, text=text, is_open_ended=True
                )
            elif q_type == "closed":
                options = q_data.get("options", [])
                correct_option_idx = q_data.get("correctOption", 0)  # 0-based index

                # Ensure we have 4 options or handle it gracefully.
                # Model expects option1..4.
                # Pad if necessary or take first 4.
                opts = (options + [""] * 4)[:4]

                MultipleChoiceOption.objects.create(
                    question_bank=question_bank,
                    text=text,
                    is_open_ended=False,
                    option1=opts[0],
                    option2=opts[1],
                    option3=opts[2],
                    option4=opts[3],
                    correct_option=correct_option_idx + 1,  # Model uses 1-based
                )

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
