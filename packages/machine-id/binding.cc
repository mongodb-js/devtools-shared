#include <napi.h>
#include <string>

#ifdef __APPLE__
#include <CoreFoundation/CoreFoundation.h>
#include <IOKit/IOKitLib.h>
#endif

using namespace Napi;

namespace
{

#ifdef __APPLE__
  // Get macOS machine ID using IOKit framework directly
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
#endif

  // Function to get the machine ID
  Value GetMachineId(const CallbackInfo &args)
  {
    Env env = args.Env();

#ifdef __APPLE__
    std::string id = getMachineId();
    if (!id.empty())
    {
      return String::New(env, id);
    }
#endif

    // If we couldn't get a machine ID or platform not supported
    return env.Undefined();
  }

}

static Object InitModule(Env env, Object exports)
{
  exports["getMachineId"] = Function::New(env, GetMachineId);
  return exports;
}

NODE_API_MODULE(machine_id, InitModule)
