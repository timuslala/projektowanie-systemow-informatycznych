from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, viewsets

from .models import Course
from .permissions import IsCourseInstructor, IsCourseStudentReadOnly


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = "__all__"


class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [
        IsCourseStudentReadOnly | IsCourseInstructor | permissions.IsAdminUser
    ]
    serializer_class = CourseSerializer
    queryset = Course.objects.all()

    def get_queryset(self):
        if not self.request.user.is_authenticated:
            return Course.objects.none()
        user = self.request.user
        if user.is_superuser:
            courses = Course.objects.all()
        elif getattr(user, "is_teacher", False):
            courses = Course.objects.filter(instructor=user)
        else:
            courses = Course.objects.filter(courseprogress__user=user)

        return courses

    def get_object(self):
        course_id = self.kwargs.get("course_id")
        obj = get_object_or_404(self.get_queryset(), id=course_id)
        self.check_object_permissions(self.request, obj)
        return obj
