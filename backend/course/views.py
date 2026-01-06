from django.shortcuts import get_object_or_404
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from common.swagger_utils import swagger_tags
from user.models import User

from .models import Course, CourseProgress
from .permissions import (
    IsCourseInstructor,
    IsCourseStudentReadOnly,
    IsEnrolledToCourseTaughtByInstructor,
    IsInstructor,
)


class UserInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "name", "surname", "is_teacher"]


class CourseProgressSerializer(serializers.ModelSerializer):
    student = UserInfoSerializer(source="user", read_only=True)

    class Meta:
        model = CourseProgress
        fields = ["student", "percent_complete", "completed"]
        read_only_fields = [
            "student",
            "percent_complete",
            "completed",
        ]


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = ["id", "title", "description", "instructor"]
        read_only_fields = ["instructor"]


class UserInfoView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [
        IsEnrolledToCourseTaughtByInstructor | IsInstructor | permissions.IsAdminUser
    ]

    def get(self, request, **kwargs):
        user_id = self.kwargs.get("user_id")
        user = User.objects.filter(id=user_id).first()
        if user == None:
            raise PermissionDenied
        self.check_object_permissions(self.request, user)
        return Response(data=UserInfoSerializer(user).data, status=200)


@swagger_tags(tags=["courses"])
class CourseViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
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

    def perform_create(self, serializer):
        serializer.save(instructor=self.request.user)

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[IsCourseInstructor | permissions.IsAdminUser],
    )
    @swagger_auto_schema(tags=["courses - enrollments"])
    def enrolled_students(self, request, pk=None, **kwargs):
        """List all students currently enrolled in this course."""
        course = self.get_object()
        enrollments = (
            course.courseprogress_set.all()
        )  # via related_name or default reverse
        serializer = CourseProgressSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[IsCourseInstructor | permissions.IsAdminUser],
    )
    @swagger_auto_schema(tags=["courses - enrollments"])
    def eligible_students(self, request, pk=None, **kwargs):
        """List active students who are NOT yet enrolled in this course."""
        course = self.get_object()
        enrolled_user_ids = course.courseprogress_set.values_list("user_id", flat=True)
        eligible = User.objects.filter(
            is_active=True, is_staff=False, is_teacher=False
        ).exclude(id__in=enrolled_user_ids)
        serializer = UserInfoSerializer(eligible, many=True)
        return Response(serializer.data)

    @action(
        detail=True,
        methods=["post"],
        url_path="enroll/(?P<student_id>\\d+)",
        permission_classes=[IsCourseInstructor | permissions.IsAdminUser],
    )
    @swagger_auto_schema(
        tags=["courses - enrollments"],
        request_body=None,
    )
    def enroll_student(self, request, pk=None, student_id=None, **kwargs):
        """Enroll a student in the course."""
        course = self.get_object()
        try:
            student = User.objects.get(
                id=student_id, is_active=True, is_staff=False, is_teacher=False
            )
        except User.DoesNotExist:
            return Response({"detail": "Eligible student not found."}, status=404)

        progress, created = CourseProgress.objects.get_or_create(
            user=student, course=course, defaults={"percent_complete": 0.0}
        )
        if created:
            return Response({"detail": "Student enrolled successfully."}, status=201)
        return Response({"detail": "Student is already enrolled."}, status=400)

    @action(
        detail=True,
        methods=["delete"],
        url_path="unenroll/(?P<student_id>\\d+)",
        permission_classes=[IsCourseInstructor | permissions.IsAdminUser],
    )
    @swagger_auto_schema(tags=["courses - enrollments"])
    def unenroll_student(self, request, pk=None, student_id=None, **kwargs):
        """Remove (unenroll) a student from the course."""
        course = self.get_object()
        try:
            progress = CourseProgress.objects.get(user_id=student_id, course=course)
            progress.delete()
            return Response({"detail": "Student unenrolled successfully."})
        except CourseProgress.DoesNotExist:
            return Response(
                {"detail": "Student is not enrolled in this course."}, status=404
            )

    @action(
        detail=True,
        methods=["get"],
        permission_classes=[
            IsCourseStudentReadOnly | IsCourseInstructor | permissions.IsAdminUser
        ],
    )
    def my_enrollments(self, request, pk=None, **kwargs):
        pass
