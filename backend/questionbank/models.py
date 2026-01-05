from django.db import models


# Create your models here.
class QuestionBank(models.Model):
    title = models.CharField(max_length=255)
    user = models.ForeignKey("user.User", on_delete=models.CASCADE)
