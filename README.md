# LLM 压测数据网页版表格使用指南

## 功能简介

通过 `--upload_web` 参数，可以将压测结果推送到 Web 网页进行可视化展示。网页支持：
- 表格展示（列排序、筛选过滤）
- 可视化图表（吞吐曲线、延迟分布等）
- 数据导出（CSV、JSON）

## 快速开始

### 1. 部署 Web 页面

#### 使用 GitHub Pages（推荐）

```bash
# 1. 在 GitHub 创建一个新仓库（如：llm-pressure-web）
# 2. 将 pressure/web 目录复制到仓库根目录
# 3. 推送到 GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourname/llm-pressure-web.git
git push -u origin main

# 4. 在 GitHub 仓库设置中启用 Pages
# Settings -> Pages -> Source: main branch -> Save
# 等待几分钟后，访问 https://yourname.github.io/llm-pressure-web/
```

#### 使用 GitLab Pages

```bash
# 1. 创建 .gitlab-ci.yml 文件
cat > .gitlab-ci.yml << 'EOF'
pages:
  stage: deploy
  script:
    - mkdir -p public
    - cp -r web/* public/
  artifacts:
    paths:
      - public
  only:
    - main
EOF

# 2. 推送到 GitLab
# Pages 将在 https://yourname.gitlab.io/your-project/
```

### 2. 配置本地 Git 仓库

在运行压测的机器上克隆仓库：

```bash
git clone https://github.com/yourname/llm-pressure-web.git ~/llm-pressure-web
```

### 3. 运行压测并推送数据

```bash
python -m pressure.pressure \
    --url http://your-llm-service/v1/chat/completions \
    --dataset random \
    --model gpt-3.5-turbo \
    --cc 1,11,10 \
    --upload_web ~/llm-pressure-web
```

推送成功后，刷新网页即可看到新增的数据。

## 命令行参数

| 参数 | 说明 | 示例 |
|------|------|------|
| `--upload_web` | Git 仓库路径，数据将推送到该仓库 | `~/llm-pressure-web` |
| `--remark` | 备注信息，将显示在提交消息中 | `测试 A100*8 配置` |

## 网页功能

### 表格操作
- **排序**: 点击表头进行升序/降序排序
- **筛选**: 使用顶部的筛选器按 GPU、Engine、并发数等过滤
- **搜索**: 在搜索框输入 Job ID 或备注进行模糊搜索
- **分页**: 每页显示 50 条记录

### 可视化图表
- **吞吐 vs 并发数**: 展示不同并发下的吞吐量变化
- **延迟分布**: 展示最近 10 次测试的延迟指标
- **成功率分布**: 饼图展示成功率范围分布
- **QPS vs 并发数**: 展示 Stream 和 Non-Stream 模式下的 QPS

### 数据导出
- **CSV**: 导出筛选后的数据为 CSV 文件（支持 Excel）
- **JSON**: 导出为 JSON 格式

## 文件结构

```
pressure/web/
├── index.html          # 主页面
├── data/
│   └── results.json    # 压测数据文件
├── css/
│   └── style.css       # 样式
└── js/
    ├── data-loader.js  # 数据加载
    ├── table.js        # 表格渲染
    ├── charts.js       # 图表
    └── export.js       # 导出
```

## 故障排查

### 推送失败

1. 检查 Git 凭证配置：
```bash
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

2. 如果使用 HTTPS，可能需要配置 Personal Access Token：
```bash
git remote set-url origin https://TOKEN@github.com/yourname/llm-pressure-web.git
```

### 网页显示旧数据

1. 清除浏览器缓存
2. 检查 results.json 中的 `last_updated` 字段
3. 查看 GitHub Actions 或 GitLab CI 的部署状态

### Git 冲突

如果多人同时推送数据，可能会出现冲突：

```bash
cd ~/llm-pressure-web
git pull --rebase
# 如果有冲突，解决后
git push
```
