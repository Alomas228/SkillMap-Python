"""/api/users — управление пользователями (HR-only)."""
import uuid

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import User
from ..permissions import IsHR
from ..serializers import CreateUserRequestSerializer, UserPublicSerializer


class UsersListCreateView(APIView):
    permission_classes = [IsHR]

    def get(self, request):
        users = User.objects.order_by("full_name")
        return Response(UserPublicSerializer(users, many=True).data)

    def post(self, request):
        serializer = CreateUserRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        email = data["email"].strip().lower()

        if User.objects.filter(email__iexact=email).exists():
            return Response(
                {"message": "Пользователь с таким email уже существует"},
                status=status.HTTP_409_CONFLICT,
            )

        user = User(
            public_id=uuid.uuid4(),
            email=email,
            full_name=data["fullName"].strip(),
            position=(data.get("position") or "").strip(),
            department=(data.get("department") or "").strip(),
            role=data["role"].strip(),
        )
        user.set_password(data["password"])
        user.save()

        return Response(UserPublicSerializer(user).data)


class UserByPublicIdView(APIView):
    permission_classes = [IsHR]

    def get(self, request, public_id: uuid.UUID):
        try:
            user = User.objects.get(public_id=public_id)
        except User.DoesNotExist:
            return Response(
                {"message": "Пользователь не найден"},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(UserPublicSerializer(user).data)
