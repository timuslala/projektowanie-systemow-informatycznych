from django.shortcuts import render
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, serializers, viewsets

from common.swagger_utils import swagger_tags_for_viewset

from .models import Course
from .permissions import IsCourseInstructor, IsCourseStudentReadOnly


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"


@swagger_auto_schema(tags=["courseeee"])
class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [
        IsCourseStudentReadOnly | IsCourseInstructor | permissions.IsAdminUser
    ]
    serializer_class = CourseSerializer

    def get_queryset(self):
        return Course.objects.filter(self.request.user)
