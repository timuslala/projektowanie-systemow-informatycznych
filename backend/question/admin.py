from django.contrib import admin

from .models import MultipleChoiceOption, Question

# Register your models here.
admin.site.register(Question)
admin.site.register(MultipleChoiceOption)
