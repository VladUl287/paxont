import wabt from "wabt"

export async function compile(watCode: string): Promise<Uint8Array> {
    const wabtModule = await wabt()
    const module = wabtModule.parseWat('', watCode)
    return module.toBinary({}).buffer
}
