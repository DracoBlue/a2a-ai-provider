#!/bin/bash
cd `dirname $0`

if [ ! -d a2a-tck ]
then
    # 1. Clone the repo, but with minimal files (no checkout)
    git clone --no-checkout https://github.com/a2aproject/a2a-tck.git
    cd a2a-tck

    # 2. Enable sparse checkout
    git sparse-checkout init --cone

    # 3. Define the folder(s) you want
    git sparse-checkout set python-sut/tck_core_agent

    # 4. Checkout
    git checkout main
else
    cd a2a-tck
    git stash
    git pull origin main --force
fi

cd python-sut/tck_core_agent

cat <<'EOF' > Dockerfile
FROM python:3

RUN pip install uv
WORKDIR /usr/src/app
COPY . .

# we won't use the local a2a-python source code
RUN sed -i -s 's/tool.uv.sources/disabled.uv.sources/g' pyproject.toml

RUN uv add "a2a-sdk[http-server]"

RUN sed -i -s 's/task\.contextId/task\.context_id/g' agent_executor.py

EXPOSE 9999
CMD [ "uv", "run", ".", "--host", "0.0.0.0" ]
EOF

docker build -t a2a-tck-server .
docker run -p 9999:9999 $1 --name a2a-tck-server a2a-tck-server