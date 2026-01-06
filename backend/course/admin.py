from django.contrib import admin

from .models import Course, CourseProgress

# Register your models here.
admin.site.register(Course)
admin.site.register(CourseProgress)
