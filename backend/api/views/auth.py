"""/api/auth/* — логин, логаут, текущий пользователь."""
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import User
from ..serializers import (
    LoginRequestSerializer,
    UserPublicSerializer,
    issue_tokens_for_user,
)


class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"success": False, "message": "Некорректные данные для входа"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = serializer.validated_data["email"].strip().lower()
        password = serializer.validated_data["password"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return Response(
                {"success": False, "message": "Неверная почта или пароль"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if not user.check_password(password):
            return Response(
                {"success": False, "message": "Неверная почта или пароль"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        tokens = issue_tokens_for_user(user)
        return Response(
            {
                "success": True,
                "user": UserPublicSerializer(user).data,
                "tokens": tokens,
            }
        )


class LogoutView(APIView):
    """Logout с JWT — клиент удаляет токены сам.
    Здесь опционально blacklist'им refresh-токен, если он передан.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_raw = request.data.get("refresh") if isinstance(request.data, dict) else None
        if refresh_raw:
            try:
                RefreshToken(refresh_raw).blacklist()
            except (TokenError, AttributeError):
                pass
        return Response({"success": True})


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserPublicSerializer(request.user).data)
