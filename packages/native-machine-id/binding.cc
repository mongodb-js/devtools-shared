#include <napi.h>
#include <string>

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/IOKitLib.h>
// kIOMainPortDefault and kIOMasterPortDefault are both set to 0
// and we define them here to avoid conflicts across OS versions
#define IO_PORT 0
#elif defined(__linux__)
#include <fstream>
#include <algorithm>
#elif defined(_WIN32)
#include <windows.h>
#endif

using namespace Napi;

namespace
{

#ifdef __APPLE__
  // Get macOS machine ID using IOKit framework directly
  std::string getMachineId() noexcept
  {
    std::string uuid;
    io_registry_entry_t ioRegistryRoot = IORegistryEntryFromPath(IO_PORT, "IOService:/");

    if (ioRegistryRoot == MACH_PORT_NULL)
    {
      return "";
    }

    CFStringRef uuidKey = CFSTR("IOPlatformUUID");
    CFTypeRef uuidProperty = IORegistryEntryCreateCFProperty(ioRegistryRoot, uuidKey, kCFAllocatorDefault, 0);

    if (uuidProperty)
    {
      char buffer[128];
      if (!CFStringGetCString((CFStringRef)uuidProperty, buffer, sizeof(buffer), kCFStringEncodingUTF8))
      {
        CFRelease(uuidProperty);
        IOObjectRelease(ioRegistryRoot);
        return "";
      }

      uuid = buffer;
      CFRelease(uuidProperty);
    }

    IOObjectRelease(ioRegistryRoot);
    return uuid;
  }
#elif defined(__linux__)
  // Linux machine ID paths
  const char *DBUS_PATH = "/var/lib/dbus/machine-id";
  const char *DBUS_PATH_ETC = "/etc/machine-id";

  // Trim whitespace and newlines from a string
  std::string trim(const std::string &str)
  {
    if (str.empty())
    {
      return str;
    }
    std::string result = str;
    size_t from_right = result.find_last_not_of(" \n\r\t");
    if (from_right != std::string::npos)
    {
      result.erase(from_right + 1);
    }
    result.erase(0, result.find_first_not_of(" \n\r\t"));
    return result;
  }

  // Read file contents
  std::string readFile(const char *path)
  {
    try
    {
      std::ifstream file(path);
      std::string content;

      if (file.is_open())
      {
        std::string line;

        if (!file.fail() && std::getline(file, line))
        {
          content = line;
        }

        file.close();
      }
      return content;
    }
    catch (const std::exception &)
    {
      return "";
    }
  }

  // Get Linux machine ID by reading from system files
  std::string getMachineId() noexcept
  {
    std::string uuid = readFile(DBUS_PATH);

    // Try fallback path if the first path fails
    if (uuid.empty())
    {
      uuid = readFile(DBUS_PATH_ETC);
    }

    return trim(uuid);
  }
#elif defined(_WIN32)
  // Get Windows machine ID from registry
  std::string getMachineId() noexcept
  {
    std::string uuid;
    HKEY hKey;
    LONG result = RegOpenKeyExA(
        HKEY_LOCAL_MACHINE,
        "SOFTWARE\\Microsoft\\Cryptography",
        0,
        KEY_QUERY_VALUE | KEY_WOW64_64KEY,
        &hKey);

    if (result != ERROR_SUCCESS)
    {
      return "";
    }

    char value[128] = {0};
    DWORD valueSize = sizeof(value);
    DWORD valueType;

    result = RegQueryValueExA(
        hKey,
        "MachineGuid",
        NULL,
        &valueType,
        reinterpret_cast<LPBYTE>(value),
        &valueSize);

    if (result == ERROR_SUCCESS && valueType == REG_SZ && valueSize > 0)
    {
      // Create string with explicit length based on returned valueSize
      uuid = std::string(value, valueSize - (value[valueSize - 1] == '\0' ? 1 : 0));
    }
    else
    {
      RegCloseKey(hKey);
      return "";
    }

    RegCloseKey(hKey);
    return uuid;
  }
#endif

  // Function to get the machine ID (synchronous version)
  Value GetMachineIdSync(const CallbackInfo &args)
  {
    Env env = args.Env();

#if defined(__APPLE__) || defined(__linux__) || defined(_WIN32)
    std::string id = getMachineId();
    if (!id.empty())
    {
      return String::New(env, id);
    }
#endif

    // If we couldn't get a machine ID or platform not supported, return undefined.
    return env.Undefined();
  }

  // Async worker class for getting machine ID
  class GetMachineIdWorker : public AsyncWorker
  {
  private:
    std::string id;

  public:
    GetMachineIdWorker(Function &callback)
        : AsyncWorker(callback) {}

    // This runs on a worker thread
    void Execute() override
    {
#if defined(__APPLE__) || defined(__linux__) || defined(_WIN32)
      id = getMachineId();
#endif
    }

    // This runs on the main thread after Execute completes
    void OnOK() override
    {
      Napi::Env env = Env();
      Napi::HandleScope scope(env);

      if (!id.empty())
      {
        Callback().Call({env.Null(), String::New(env, id)});
      }
      else
      {
        Callback().Call({env.Null(), env.Undefined()});
      }
    }

    void OnError(const Error &e) override
    {
      Napi::Env env = Env();
      Napi::HandleScope scope(env);
      Callback().Call({e.Value(), env.Undefined()});
    }
  };

  // Function to get the machine ID asynchronously
  Value GetMachineIdAsync(const CallbackInfo &args)
  {
    Env env = args.Env();

    // Check if a callback was provided
    if (args.Length() < 1 || !args[0].IsFunction())
    {
      TypeError::New(env, "Callback function expected").ThrowAsJavaScriptException();
      return env.Undefined();
    }

    // Get the callback function
    Function callback = args[0].As<Function>();

    // Create and queue the async worker
    GetMachineIdWorker *worker = new GetMachineIdWorker(callback);
    worker->Queue();

    return env.Undefined();
  }
}

static Object InitModule(Env env, Object exports)
{
  exports["getMachineIdSync"] = Function::New(env, GetMachineIdSync);
  exports["getMachineIdAsync"] = Function::New(env, GetMachineIdAsync);
  return exports;
}

NODE_API_MODULE(native_machine_id, InitModule)
