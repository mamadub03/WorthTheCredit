from tests.conftest import auth

PROFILE = {
    "major": "Software Engineering",
    "interests": ["Machine learning", "machine  learning", "Data"],
    "skills": ["Python"],
    "career_goals": "ML engineer",
    "personal_interests": ["Public speaking"],
    "degree_requirements": "One gen-ed",
}


def test_profile_roundtrip(client):
    assert client.get("/profile", headers=auth()).json() == {"detail": "profile_not_found"}
    r = client.put("/profile", json=PROFILE, headers=auth())
    assert r.status_code == 200
    p = r.json()
    assert p["interests"] == ["Machine learning", "Data"]
    assert p["academic_interests"] == p["interests"] and p["existing_skills"] == ["Python"]  # FE names too
    assert p["updated_at"]
    assert client.get("/profile", headers=auth()).json()["major"] == "Software Engineering"
    r = client.put("/profile", json={**PROFILE, "major": "Computer Science"}, headers=auth())
    assert r.json()["major"] == "Computer Science"


def test_frontend_field_names_accepted(client):
    body = {"major": "SE", "academic_interests": ["AI"], "existing_skills": ["Java"]}
    p = client.put("/profile", json=body, headers=auth()).json()
    assert p["interests"] == ["AI"] and p["skills"] == ["Java"]


def test_profiles_are_per_user(client):
    client.put("/profile", json=PROFILE, headers=auth("auth0|a"))
    assert client.get("/profile", headers=auth("auth0|b")).status_code == 404


def test_profile_validation(client):
    assert client.put("/profile", json={**PROFILE, "major": "  "}, headers=auth()).status_code == 422
    too_many = {**PROFILE, "skills": [f"s{i}" for i in range(11)]}
    assert client.put("/profile", json=too_many, headers=auth()).status_code == 422
    assert client.put("/profile", json={**PROFILE, "career_goals": "x" * 1001}, headers=auth()).status_code == 422
