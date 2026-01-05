from django.db import models


# Create your models here.
class Course(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField()
    instructor = models.ForeignKey("user.User", on_delete=models.CASCADE)


class CourseProgress(models.Model):
    user = models.ForeignKey("user.User", on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    completed = models.BooleanField(default=False)
    percent_complete = models.FloatField(default=0.0)

    class Meta:
        unique_together = ("user", "course")
