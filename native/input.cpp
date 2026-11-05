// Passive input observer. Never swallows, injects or modifies Windows input.
#define WIN32_LEAN_AND_MEAN
#define NOMINMAX
#include <windows.h>
#include <shellapi.h>
#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <cwchar>
#include <deque>

struct Click { LONG x; LONG y; DWORD time; };
static std::deque<Click> clicks; // Accessed only by the hook/message-pump thread.
static DWORD mainThread;
static HHOOK hook;
static LRESULT CALLBACK observe(int code, WPARAM message, LPARAM data) {
    if (code == HC_ACTION && message == WM_LBUTTONDOWN) {
        const auto *event = reinterpret_cast<MSLLHOOKSTRUCT *>(data);
        if (clicks.size() < 256) clicks.push_back({event->pt.x, event->pt.y, event->time});
        PostThreadMessageW(mainThread, WM_APP + 1, 0, 0);
    }
    // ALWAYS forward, including clicks on our own kitten.
    return CallNextHookEx(hook, code, message, data);
}
static void status(DWORD parentId) {
    HWND foreground = GetForegroundWindow();
    DWORD pid = 0;
    GetWindowThreadProcessId(foreground, &pid);
    wchar_t className[64] = {};
    GetClassNameW(foreground, className, 64);
    RECT rect = {};
    MONITORINFO monitor = {sizeof(MONITORINFO)};
    bool fullscreen = false;
    if (foreground && pid != parentId && wcscmp(className, L"Progman") && wcscmp(className, L"WorkerW") && GetWindowRect(foreground, &rect) && GetMonitorInfoW(MonitorFromWindow(foreground, MONITOR_DEFAULTTONEAREST), &monitor)) {
        const auto &m = monitor.rcMonitor;
        fullscreen = rect.left <= m.left && rect.top <= m.top && rect.right >= m.right && rect.bottom >= m.bottom;
    }
    QUERY_USER_NOTIFICATION_STATE notification = QUNS_ACCEPTS_NOTIFICATIONS;
    SHQueryUserNotificationState(&notification);
    SYSTEM_POWER_STATUS power = {};
    bool battery = GetSystemPowerStatus(&power) && power.ACLineStatus == 0;
    std::printf("{\"type\":\"status\",\"fullscreen\":%s,\"game\":%s,\"battery\":%s}\n", fullscreen ? "true" : "false", notification == QUNS_RUNNING_D3D_FULL_SCREEN ? "true" : "false", battery ? "true" : "false");
}
int main(int argc, char **argv) {
    const bool selfTest = argc > 1 && std::strcmp(argv[1], "--self-test") == 0;
    const DWORD parentId = argc > 1 && !selfTest ? std::strtoul(argv[1], nullptr, 10) : 0;
    HANDLE parent = parentId ? OpenProcess(SYNCHRONIZE, FALSE, parentId) : nullptr;
    if (parentId && !parent) return 2;
    SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
    std::setvbuf(stdout, nullptr, _IONBF, 0);
    mainThread = GetCurrentThreadId();
    MSG message;
    PeekMessageW(&message, nullptr, WM_USER, WM_USER, PM_NOREMOVE);
    hook = SetWindowsHookExW(WH_MOUSE_LL, observe, GetModuleHandleW(nullptr), 0);
    if (!hook) {
        std::printf("{\"type\":\"error\",\"code\":%lu}\n", GetLastError());
        if (parent) CloseHandle(parent);
        return 3;
    }
    std::puts("{\"type\":\"ready\",\"version\":1}");
    status(parentId);
    if (!selfTest) {
        const UINT_PTR timer = SetTimer(nullptr, 0, 500, nullptr);
        if (!timer) { UnhookWindowsHookEx(hook); if (parent) CloseHandle(parent); return 4; }
        while (GetMessageW(&message, nullptr, 0, 0) > 0) {
            if (message.message == WM_APP + 1) {
                while (!clicks.empty()) {
                    auto click = clicks.front(); clicks.pop_front();
                    std::printf("{\"type\":\"click\",\"x\":%ld,\"y\":%ld,\"time\":%lu}\n", click.x, click.y, click.time);
                }
            } else if (message.message == WM_TIMER) {
                if (parent && WaitForSingleObject(parent, 0) != WAIT_TIMEOUT) break;
                status(parentId);
            } else { TranslateMessage(&message); DispatchMessageW(&message); }
        }
        KillTimer(nullptr, timer);
    }
    UnhookWindowsHookEx(hook);
    if (parent) CloseHandle(parent);
    return 0;
}
