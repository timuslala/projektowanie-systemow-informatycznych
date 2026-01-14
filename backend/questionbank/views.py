from rest_framework.permissions import IsAdminUser
from rest_framework.serializers import ModelSerializer, SerializerMethodField
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication

from common.permissions import IsInstructor

from .models import QuestionBank


class QuestionBankSerializer(ModelSerializer):
    number_of_questions = SerializerMethodField()

    class Meta:
        model = QuestionBank
        fields = ["id", "title", "number_of_questions", "question_set"]
        read_only_fields = ["id", "number_of_questions", "question_set"]

    def get_number_of_questions(self, obj):
        return obj.question_set.count()


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
