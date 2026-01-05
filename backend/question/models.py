from django.db import models


# Create your models here.
class Question(models.Model):
    text = models.TextField()
    question_bank = models.ForeignKey(
        "questionbank.QuestionBank", on_delete=models.CASCADE
    )
    is_open_ended = models.BooleanField(default=False)


class MultipleChoiceOption(Question):
    option1 = models.CharField(max_length=255)
    option2 = models.CharField(max_length=255)
    option3 = models.CharField(max_length=255)
    option4 = models.CharField(max_length=255)
    correct_option = models.IntegerField(
        choices=[(1, "Option 1"), (2, "Option 2"), (3, "Option 3"), (4, "Option 4")]
    )
