from rest_framework import permissions


class IsCourseInstructor(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.is_teacher and request.user == obj.instructor


class IsCourseStudentReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return obj.courseprogress.filter(user=request.user).exists()
