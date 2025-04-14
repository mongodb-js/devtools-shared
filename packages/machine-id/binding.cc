#include <napi.h>
#include <string>

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/IOKitLib.h>
#elif defined(__linux__)
#include <fstream>
#include <algorithm>
#endif

using namespace Napi;

namespace
{

#ifdef __APPLE__
  // Get macOS machine Id using IOKit framework directly
  std::string getMachineId()
  {
    std::string uuid;
    io_registry_entry_t ioRegistryRoot = IORegistryEntryFromPath(kIOMainPortDefault, "IOService:/");

    if (ioRegistryRoot == MACH_PORT_NULL)
    {
      return "";
    }

    CFStringRef uuidKey = CFSTR("IOPlatformUUID");
    CFTypeRef uuidProperty = IORegistryEntryCreateCFProperty(ioRegistryRoot, uuidKey, kCFAllocatorDefault, 0);

    if (uuidProperty)
    {
      char buffer[128];
      if (CFStringGetCString((CFStringRef)uuidProperty, buffer, sizeof(buffer), kCFStringEncodingUTF8))
      {
        uuid = buffer;
      }
      CFRelease(uuidProperty);
    }

    IOObjectRelease(ioRegistryRoot);
    return uuid;
  }
#elif defined(__linux__)
  // Linux machine Id paths
  const char *DBUS_PATH = "/var/lib/dbus/machine-id";
  const char *DBUS_PATH_ETC = "/etc/machine-id";

  // Trim whitespace and newlines from a string
  std::string trim(const std::string &str)
  {
    std::string result = str;
    result.erase(result.find_last_not_of(" \n\r\t") + 1);
    result.erase(0, result.find_first_not_of(" \n\r\t"));
    return result;
  }

  // Read file contents
  std::string readFile(const char *path)
  {
    std::ifstream file(path);
    std::string content;

    if (file.is_open())
    {
      std::string line;
      if (std::getline(file, line))
      {
        content = line;
      }
      file.close();
    }

    return content;
  }

  // Get Linux machine Id by reading from system files
  std::string getMachineId()
  {
    std::string id = readFile(DBUS_PATH);

    // Try fallback path if the first path fails
    if (id.empty())
    {
      id = readFile(DBUS_PATH_ETC);
    }

    return trim(id);
  }
#endif

  // Function to get the machine Id
  Value GetMachineId(const CallbackInfo &args)
  {
    Env env = args.Env();

#if defined(__APPLE__) || defined(__linux__)
    std::string id = getMachineId();
    if (!id.empty())
    {
      return String::New(env, id);
    }
#endif

    // If we couldn't get a machine Id or platform not supported
    return env.Undefined();
  }

}

static Object InitModule(Env env, Object exports)
{
  exports["getMachineId"] = Function::New(env, GetMachineId);
  return exports;
}

NODE_API_MODULE(machine_id, InitModule)
