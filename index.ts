import puppeteer from "puppeteer";
import 'dotenv/config'

if (!process.env.DOCTOR_NAMES) {
    throw new Error('DOCTOR_NAMES not exist - check required envs')
}

const sleepTime = 500
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
await sleepy()
await clickRegButton()
await sleep(4000) // heuristic
await selectDoctorSpecialization()
await sleep(4000) // heuristic

const doctorNames = process.env.DOCTOR_NAMES?.split(',')
for (let name of doctorNames) {
    await selectDoctorByName(name)
    await sleepy()
    try {
        await selectFreeDate()
        await sleepy()
        await selectFreeTime()
        await sleepy()
        await register()
    } catch (e) {
        console.error(e)
    }
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
        specializationButton?.click()
    } catch {
        throw new Error('DOCTOR_SPECIALIZATION not exist - check required envs')
    }
}

async function selectDoctorByName(name: string) {
    try {
        const specializationButton = await searchElementByTextContent('button', name)
        specializationButton?.click()
    } catch {
        console.error(`Error when try select doctor with name - ${name}. Does doctor exist?`)
    }
}

async function selectFreeDate() {
    const freeDateButton = await page.$('button.er-button__time_active_free')
    if (!freeDateButton) throw new Error('No free date')
    freeDateButton.click()
}

async function selectFreeTime() {
    const freeTimeButton = await page.$('button.er-button__time_full:not(.er-button__time_occupied)')
    if (!freeTimeButton) throw new Error('No free time')
    freeTimeButton.click()
}

async function register() {
    const registerButton = await searchElementByTextContent('button', 'Записаться')
    registerButton?.click()
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

async function sleep(sleepMs: number) {
    return new Promise((res) => setTimeout(res, sleepMs))
}

async function sleepy() {
    return sleep(sleepTime)
}