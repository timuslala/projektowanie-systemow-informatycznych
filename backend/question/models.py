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
    is_open_ended = models.BooleanField(default=False)
    tags = models.TextField(blank=True, help_text="Comma-separated tags")


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
    is_multiple_choice = models.BooleanField(default=False)
    correct_options = models.JSONField(
        default=list, blank=True, null=True, help_text="List of correct option indices (1-based) for multiple choice"
    )
