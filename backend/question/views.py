from django.shortcuts import render
from rest_framework.serializers import ModelSerializer

from .models import MultipleChoiceOption, Question

# Create your views here.


class MultipleChoiceOptionSerializer(ModelSerializer):
    class Meta:
        model = MultipleChoiceOption
        exclude = ["id", "question"]


class QuestionSerializer(ModelSerializer):
    mcq = MultipleChoiceOptionSerializer(required=False)

    class Meta:
        model = Question
        fields = ["id", "text", "question_type", "mcq"]
