#include <napi.h>

Napi::Value Add(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  if (info.Length() < 1 || !info[0].IsTypedArray())
  {
    Napi::TypeError::New(env, "Uint8Array expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  auto arr = info[0].As<Napi::Uint8Array>();
  const uint8_t *data = arr.Data();
  size_t byte_length = arr.ByteLength();

  size_t length = byte_length / sizeof(char16_t);
  const char16_t *u16 = reinterpret_cast<const char16_t *>(data);

  return Napi::String::New(env, u16, length);
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("add", Napi::Function::New(env, Add));
  return exports;
};

NODE_API_MODULE(addon, Init)