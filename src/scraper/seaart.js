import axios from 'axios'
import FormData from 'form-data'

async function uploadMedia(buffer) {
    const form = new FormData()
    form.append('file', buffer, { filename: 'image.jpg' })
    form.append('type', 'permanent')

    const res = await axios.post(
        'https://tmp.malvryx.dev/upload',
        form,
        { headers: form.getHeaders() }
    )

    const url = res.data?.cdnUrl || res.data?.directUrl || null
    if (!url) throw new Error("Upload gagal")
    return url
}

async function live3d(img, prompt) {
    const imageUrl = await uploadMedia(img)

    const initUrl = `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2?prompt=${encodeURIComponent(prompt)}&image=${encodeURIComponent(imageUrl)}`
    const { data: initRes } = await axios.get(initUrl)

    if (!initRes.success || !initRes.task_id) {
        throw new Error("Gagal memulai task edit")
    }

    const taskId = initRes.task_id
    const fp = initRes.fp

    let resultUrl = null
    let attempts = 0

    while (!resultUrl && attempts < 25) {
        await new Promise(r => setTimeout(r, 5000))
        const checkUrl = `https://omegatech-api.dixonomega.tech/api/ai/nano-banana2-result?task_id=${taskId}${fp ? `&fp=${fp}` : ''}`
        const { data: check } = await axios.get(checkUrl)

        if (check.status === 'completed' && check.image_url) {
            resultUrl = check.image_url
            break
        }
        if (check.status === 'failed') throw new Error("Edit gagal di server")
        attempts++
    }

    if (!resultUrl) throw new Error("Timeout, coba lagi nanti")

    return {
        task_id: taskId,
        image: resultUrl
    }
}

export { live3d }