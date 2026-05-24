"""/api/ask — поиск сотрудников по навыку."""
from collections import defaultdict

from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from ..models import UserSkill

LEVEL_PRIORITY = {"Senior": 4, "Middle": 3, "Junior": 2, "Intern": 1}
LEVEL_TO_UI = {
    "Senior": "expert",
    "Middle": "advanced",
    "Junior": "experienced",
    "Intern": "novice",
}
UI_TO_LEVEL = {v: k for k, v in LEVEL_TO_UI.items()}


class AskView(APIView):
    def get(self, request):
        skill_q = (request.query_params.get("skill") or "").strip().lower()
        if not skill_q:
            return Response([])

        matches = list(
            UserSkill.objects.select_related("user", "skill").filter(
                Q(skill__name__icontains=skill_q)
                | Q(skill__category__icontains=skill_q)
            )
        )

        by_user = defaultdict(list)
        for us in matches:
            if us.user is None or us.skill is None:
                continue
            by_user[us.user_id].append(us)

        results = []
        for user_skills in by_user.values():
            best = max(
                user_skills, key=lambda us: LEVEL_PRIORITY.get(us.level, 0)
            )
            user = best.user
            matching = sorted({us.skill.name for us in user_skills})
            results.append(
                {
                    "publicId": user.public_id,
                    "fullName": user.full_name,
                    "position": user.position,
                    "department": user.department,
                    "level": LEVEL_TO_UI.get(best.level, "novice"),
                    "matchingSkills": matching,
                }
            )

        results.sort(
            key=lambda r: LEVEL_PRIORITY.get(UI_TO_LEVEL.get(r["level"], "Intern"), 0),
            reverse=True,
        )
        return Response(results)
