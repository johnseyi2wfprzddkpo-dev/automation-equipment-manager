# 后端说明

## 启动

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

默认地址：http://127.0.0.1:8000

接口文档：http://127.0.0.1:8000/docs

健康检查：http://127.0.0.1:8000/api/health
