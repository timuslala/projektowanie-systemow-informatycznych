from rest_framework import permissions


class IsCourseInstructor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(
            request.user, "is_teacher", False
        )

    def has_object_permission(self, request, view, obj):
        return request.user == obj.instructor


class IsCourseStudentReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return obj.courseprogress_set.filter(user=request.user).exists()
        return False


class IsEnrolledToCourseTaughtByInstructor(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user.courseprogress_set.filter(course__instructor=obj).exists()


class IsSameUser(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return request.user == obj
