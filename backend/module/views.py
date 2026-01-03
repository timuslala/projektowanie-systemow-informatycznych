from django.shortcuts import render
from rest_framework import viewsets, serializers
from .models import Module
# Create your views here.
class ModuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Module
        fields = '__all__'

class ModuleViewSet(viewsets.ModelViewSet):
    serializer_class = ModuleSerializer

    def get_queryset(self):
        #get only modules related to a specific course
        course_id = self.kwargs.get('course_id')
        if course_id:
            return Module.objects.filter(course__id=course_id)
        return Module.objects.all()