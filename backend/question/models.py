from django.db import models


# Create your models here.
class Question(models.Model):
    OPEN_ENDED = "open"
    MULTIPLE_CHOICE = "mcq"

    QUESTION_TYPES = [
        (OPEN_ENDED, "Open Ended"),
        (MULTIPLE_CHOICE, "Multiple Choice"),
    ]

    text = models.TextField()
    question_bank = models.ForeignKey(
        "questionbank.QuestionBank", on_delete=models.CASCADE
    )
    question_type = models.CharField(max_length=10, choices=QUESTION_TYPES)


class MultipleChoiceOption(models.Model):
    question = models.OneToOneField(
        Question, on_delete=models.CASCADE, related_name="mcq"
    )
    option1 = models.CharField(max_length=255)
    option2 = models.CharField(max_length=255)
    option3 = models.CharField(max_length=255)
    option4 = models.CharField(max_length=255)
    correct_option = models.IntegerField(
        choices=[(1, "Option 1"), (2, "Option 2"), (3, "Option 3"), (4, "Option 4")]
    )
