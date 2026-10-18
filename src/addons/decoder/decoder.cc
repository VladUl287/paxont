#include <napi.h>

Napi::Value Decode(const Napi::CallbackInfo &info)
{
  Napi::Env env = info.Env();

  auto src = info[0].As<Napi::Uint8Array>();
  uint8_t *mem_source = src.Data();
  uint32_t start = info[1].As<Napi::Number>().Uint32Value();
  uint32_t end = info[2].As<Napi::Number>().Uint32Value();

  const char *utf8 = reinterpret_cast<const char *>(mem_source + start);

  return Napi::String::New(env, utf8, end - start);
}

Napi::Object Init(Napi::Env env, Napi::Object exports)
{
  exports.Set("decode", Napi::Function::New(env, Decode));
  return exports;
};

NODE_API_MODULE(addon, Init)