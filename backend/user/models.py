from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    name = models.CharField(max_length=30, blank=True)
    surname = models.CharField(max_length=30, blank=True)
    is_teacher = models.BooleanField(default=False)
    validation_code = models.IntegerField(blank=True, null=True)
