from django.db import models


# Create your models here.
class QuestionResponse(models.Model):
    question = models.ForeignKey("question.Question", on_delete=models.CASCADE)
    user = models.ForeignKey("user.User", on_delete=models.CASCADE)
    response_text = models.TextField(null=True, blank=True)
    selected_option = models.PositiveSmallIntegerField(
        null=True, blank=True
    )  # For multiple choice questions
    selected_options = models.JSONField(default=list, blank=True, help_text="List of selected option indices (1-based) for multiple choice")
    instructor_comment = models.TextField(null=True, blank=True)
    points = models.DecimalField(max_digits=6, decimal_places=2, default=0)
