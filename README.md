# jc — j 命令套件

> 跨平台系统快捷命令集。将 Windows batch 版 `j` 命令套件移植为纯 TypeScript 跨平台 npm CLI。

## 安装

```bash
npm install -g jc
```

## 用法

```bash
jc                    # 显示帮助
jc l                  # 列出所有组

jc claude             # 启动 Claude Code
jc claude b           # 跳过权限模式
jc claude r           # 恢复上次会话

jc happy              # 启动 Happy Claude
jc happy daemon       # Happy 守护进程模式

jc w l                # 列出 w 组 11 个类别
jc w l proc           # 进程类命令列表
jc w p 3306           # 查 3306 端口占用
jc w pk 8080          # 一键查杀 8080 端口进程
jc w k 1234           # 按 PID 杀进程
jc w top              # CPU 占用 Top20
jc w sysinfo          # 系统详细信息
jc w cpu              # CPU 信息
jc w disk             # 磁盘卷信息
jc w ip               # 网络接口信息
jc w wifi             # Wi-Fi 连接信息
jc w mac              # MAC 地址
jc w who              # 当前用户信息
jc w ?                # 命令帮助
```

## 分组

| 组 | 别名 | 说明 | 命令数 |
|----|------|------|--------|
| claude | c | Claude Code CLI 包装 | 5 |
| happy | hy | Happy mobile Claude 包装 | 8 |
| w | w | 系统快捷命令集 | 87 |

## w 组 11 个类别

| 类别 | 命令数 | 说明 |
|------|--------|------|
| proc | 8 | 进程管理（端口/查杀/Top） |
| net | 15 | 网络（IP/DNS/WiFi/路由） |
| file | 13 | 文件操作（ls/cd/find/size） |
| sys | 12 | 系统信息（CPU/内存/磁盘/GPU） |
| svc | 5 | 服务管理 |
| pwr | 6 | 电源（关机/重启/锁屏/休眠） |
| reg | 4 | 注册表（仅 Windows） |
| task | 3 | 计划任务（仅 Windows） |
| tools | 14 | 系统工具（任务管理器/控制面板等） |
| user | 4 | 用户/权限 |
| wsl | 3 | WSL/Docker（仅 Windows） |

## 跨平台

- **Windows**: 全部 100 命令完整支持
- **macOS / Linux**: 核心命令支持（~80%），注册表/WSL/WiFi密码等 Windows 特有命令会提示"此命令仅支持 Windows"

## 构建

```bash
npm run build   # tsup 打包
npm test        # Vitest 测试
```

## 许可证

MIT
