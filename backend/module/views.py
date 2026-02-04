from django.shortcuts import get_object_or_404
from drf_yasg import openapi
from drf_yasg.utils import swagger_auto_schema
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from common.swagger_utils import swagger_tags

from .models import Module, ModuleProgress
from .permissions import IsCourseInstructor, IsStudentEnrolledInCourseReadOnly


class ModuleSerializer(serializers.ModelSerializer):
    completed = serializers.SerializerMethodField()

    class Meta:
        model = Module
        fields = ["id", "name", "content", "photo_url", "completed"]
        read_only_fields = ["photo_url", "completed"]

    def get_completed(self, obj):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            # Check if ModuleProgress exists and is completed
            return obj.moduleprogress_set.filter(user=request.user, completed=True).exists()
        return False


@swagger_tags(["courses - modules"])
class ModuleViewSet(viewsets.ModelViewSet):
    authentication_classes = [JWTAuthentication]
    serializer_class = ModuleSerializer
    permission_classes = [
        IsCourseInstructor | IsStudentEnrolledInCourseReadOnly | permissions.IsAdminUser
    ]

    def get_queryset(self):
        course_id = self.kwargs.get("course_id")
        module_id = self.kwargs.get("module_id")
        if course_id and module_id:
            return Module.objects.filter(course__id=course_id, id=module_id)
        elif course_id:
            return Module.objects.filter(course__id=course_id)
        return (
            Module.objects.all()
        )  # incoherency cause url patterns dont allow this case but left for future extensibility

    def get_object(self):
        obj = get_object_or_404(self.get_queryset())
        self.check_object_permissions(self.request, obj)
        return obj

    def perform_create(self, serializer):
        course_id = self.kwargs.get("course_id")
        serializer.save(course_id=course_id)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def mark_completed(self, request, course_id=None, pk=None):
        # Manually get object to bypass IsStudentEnrolledInCourseReadOnly check for POST
        try:
            module = Module.objects.get(id=pk, course__id=course_id)
        except Module.DoesNotExist:
            return Response({"error": "Module not found"}, status=404)
        
        # Check enrollment
        if not module.course.courseprogress_set.filter(user=request.user).exists():
            return Response({"error": "Not enrolled"}, status=403)

        ModuleProgress.objects.update_or_create(
            user=request.user, module=module,
            defaults={'completed': True}
        )
        return Response({'status': 'module marked as completed'})


class ModuleImageView(APIView):
    permission_classes = [
        IsCourseInstructor | IsStudentEnrolledInCourseReadOnly | permissions.IsAdminUser
    ]

    @swagger_auto_schema(tags=["courses - modules - image"])
    def get(self, request, course_id, module_id):
        try:
            module = Module.objects.get(id=module_id, course__id=course_id)
            return Response({"photo_url": module.photo_url})
        except Module.DoesNotExist:
            return Response({"error": "Module not found"}, status=404)

    @swagger_auto_schema(
        tags=["courses - modules - image"],
        operation_description="Upload a new image for the module",
        consumes=["multipart/form-data"],
        manual_parameters=[
            openapi.Parameter(
                name="image",
                in_=openapi.IN_FORM,
                type=openapi.TYPE_FILE,
                required=True,
                description="Module image file (PNG, JPG, JPEG)",
            ),
        ],
        responses={200: "Image uploaded"},
    )
    def post(self, request, course_id, module_id):
        #try:
        fileobj = request.FILES["image"]
        if not fileobj.name.lower().endswith((".png", ".jpg", ".jpeg")):
            return Response(
                {"status": "Only PNG, JPG, JPEG images are allowed"}, status=400
            )
        module = Module.objects.get(id=module_id, course__id=course_id)
        module.upload_photo(fileobj)
        return Response({"status": "image uploaded", "photo_url": module.photo_url})
        #except Exception as e:
        #    print(f"Error uploading image: {e}")
        #    return Response({"status": f"error uploading image: {str(e)}"}, status=400)
