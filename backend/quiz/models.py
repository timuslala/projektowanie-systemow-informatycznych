from django.db import models

# Create your models here.
class Quiz(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    time_limit_in_minutes = models.PositiveSmallIntegerField()
    randomize_question_order = models.BooleanField(default=False)
    show_correct_answers_on_completion = models.BooleanField(default=False)
    question_banks = models.ManyToManyField('questionbank.QuestionBank')
    course = models.ForeignKey('course.Course', on_delete=models.CASCADE)