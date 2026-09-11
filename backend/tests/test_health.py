from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    r = client.get('/api/health')
    assert r.status_code == 200
    assert r.json()['status'] == 'ok'

def test_recommendations():
    r = client.post('/api/recommendations', json={})
    assert r.status_code == 200
    assert len(r.json()['recommendations']) >= 3
