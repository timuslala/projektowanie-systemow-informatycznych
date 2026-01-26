from rest_framework import serializers
from .models import Quiz
from question.models import Question, MultipleChoiceOption

class QuestionSerializer(serializers.ModelSerializer):
    options = serializers.SerializerMethodField()
    type = serializers.SerializerMethodField()

    class Meta:
        model = Question
        fields = ['id', 'text', 'is_open_ended', 'type', 'options']

    def get_type(self, obj):
        if hasattr(obj, 'multiplechoiceoption'):
            return 'multiple_choice'
        return 'open_ended'

    def get_options(self, obj):
        if hasattr(obj, 'multiplechoiceoption'):
            mc = obj.multiplechoiceoption
            return [
                {'id': 1, 'text': mc.option1},
                {'id': 2, 'text': mc.option2},
                {'id': 3, 'text': mc.option3},
                {'id': 4, 'text': mc.option4},
            ]
        return None

class FullQuestionSerializer(QuestionSerializer):
    correct_option = serializers.SerializerMethodField()

    class Meta(QuestionSerializer.Meta):
        fields = QuestionSerializer.Meta.fields + ['correct_option', 'tags']

    def get_correct_option(self, obj):
        if hasattr(obj, 'multiplechoiceoption'):
            return obj.multiplechoiceoption.correct_option
        return None


class QuizSerializer(serializers.ModelSerializer):
    class Meta:
        model = Quiz
        fields = [
            "id", 
            "title", 
            "description", 
            "time_limit_in_minutes", 
            "randomize_question_order", 
            "show_correct_answers_on_completion", 
            "question_banks", 
            "course"
        ]
