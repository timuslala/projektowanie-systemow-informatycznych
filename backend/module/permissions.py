from rest_framework import permissions


class IsCourseInstructor(permissions.BasePermission):
    """
    Custom permission to only allow teachers of an object to edit it.
    """

    def has_object_permission(self, request, view, obj):
        # Write permissions are only allowed to the teacher of the course.
        return request.user.is_teacher and obj.course.instructor == request.user


class IsStudentEnrolledInCourseReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow students enrolled in the course to read it.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return obj.course.courseprogress_set.filter(user=request.user).exists()

        # Write permissions are not allowed to any student.
        return False
