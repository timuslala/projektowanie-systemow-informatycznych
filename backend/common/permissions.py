from rest_framework.permissions import BasePermission


class IsInstructor(BasePermission):
    def has_permission(self, request, view):
        return (
            getattr(request.user, "is_teacher", False)
            or request.user.is_staff
            or request.user.is_superuser
        )
