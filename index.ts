import puppeteer from "puppeteer";
import 'dotenv/config'

if (!process.env.DOCTOR_NAMES) {
    throw new Error('DOCTOR_NAMES not exist - check required envs')
}
const doctorNames = process.env.DOCTOR_NAMES?.split(',')
let successReg = false
const SLEEP_TIME = 500 // 500ms
const LONG_SLEEP_TIME = 4000 // 4s
const SCHEDULE_TIME = 30 * 1000 // 30s

const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
page.setViewport({
    width: 1000,
    height: 800
})
await page.goto("https://medreg.gov39.ru/");

await clickRegButton()
await sleepy()
await fillCredInputs()
await sleepy()
await submitCred()
await sleepy()
await page.reload()
await goToDoctorSpecialization()

registrationSchedule()

async function registrationSchedule() {
    if (successReg) {
        console.log('Exit from program')
        return;
    }
    await registration()
    setTimeout(registrationSchedule, SCHEDULE_TIME)
}

async function registration() {
    for (let name of doctorNames) {
        try {
            await selectDoctorByName(name)
            await sleepy()
            await selectFreeDate()
            await sleepy()
            await selectFreeTime()
            await sleepy()
            await register()
            successReg = true
            console.log('Success register to doctor with name', name)
        } catch (e) {
            // fallback
            console.error(e)
            await page.reload()
            await goToDoctorSpecialization()
        }
    }
}

async function goToDoctorSpecialization() {
    await sleepy()
    await clickRegButton()
    await sleep(LONG_SLEEP_TIME)
    await selectDoctorSpecialization()
    await sleep(LONG_SLEEP_TIME)
}

async function fillCredInputs() {
    const inputs = await page.$$('input');
    const secondNameInput = inputs.at(1)
    const insuranceUidInput = inputs.at(5)
    if (insuranceUidInput)
        await insuranceUidInput.evaluate(input => input.type = 'password')
    try {
        await secondNameInput?.type(process.env.SECOND_NAME!, { delay: 50 })
        await insuranceUidInput?.type(process.env.INSURANCE_UID!, { delay: 50 })
    } catch {
        throw new Error('Credentials not exist - check required envs')
    }
}

async function submitCred() {
    const submitButton = await searchElementByTextContent('button', 'Продолжить')
    await submitButton?.click()
}

async function clickRegButton() {
    const regButton = await searchElementByTextContent('button', 'Записаться на прием')
    await regButton?.click()
}

async function selectDoctorSpecialization() {
    try {
        const specializationButton = await searchElementByTextContent('button', process.env.DOCTOR_SPECIALIZATION!)
        await specializationButton?.click()
    } catch {
        throw new Error('DOCTOR_SPECIALIZATION not exist - check required envs')
    }
}

async function selectDoctorByName(name: string) {
    try {
        const specializationButton = await searchElementByTextContent('button', name)
        await specializationButton?.click().catch(e => {
            console.log(e)
        })
    } catch {
        throw new Error(`Error when try select doctor with name - ${name}. Does doctor exist?`)
    }
}

async function selectFreeDate() {
    const freeDateButton = await waitAndSelect('button.er-button__time_active_free')
    await freeDateButton?.click()
}

async function selectFreeTime() {
    const freeTimeButton = await waitAndSelect('button.er-button__time_full:not(.er-button__time_occupied)')
    await freeTimeButton?.click()
}

async function register() {
    const registerButton = await searchElementByTextContent('button', 'Записаться')
    await registerButton?.click()
}

async function searchElementByTextContent<T extends string>(selector: T, textContent: string) {
    const elements = await page.$$(selector);
    for (let element of elements) {
        const textCandidate = await element.evaluate((node) => node.textContent);
        if (textCandidate?.includes(textContent)) {
            return element
        }
    }
}

async function waitAndSelect<T extends string>(selector: T, options?: puppeteer.WaitForSelectorOptions) {
    await page.waitForSelector(selector, { visible: true, timeout: 2000, ...options });
    return await page.$(selector)
}

async function sleep(sleepMs: number) {
    return new Promise((res) => setTimeout(res, sleepMs))
}

async function sleepy() {
    return sleep(SLEEP_TIME)
}
