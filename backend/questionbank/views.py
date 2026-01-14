from drf_yasg.utils import swagger_auto_schema
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from rest_framework.serializers import ModelSerializer, SerializerMethodField
from rest_framework.viewsets import ModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication

from common.permissions import IsInstructor
from question.views import QuestionSerializer

from .models import QuestionBank


class QuestionPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 50


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

    @swagger_auto_schema(
        operation_summary="List questions in a question bank",
        operation_description="Returns paginated questions belonging to this question bank.",
        responses={200: QuestionSerializer(many=True)},
    )
    @action(detail=True, methods=["get"])
    def questions(self, request, question_bank_id=None):
        bank = self.get_object()
        qs = bank.question_set.all().order_by("id")

        page = self.paginate_queryset(qs)
        serializer = QuestionSerializer(page, many=True)
        return self.get_paginated_response(serializer.data)
