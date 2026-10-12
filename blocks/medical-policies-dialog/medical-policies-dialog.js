import CookieManager from '../../scripts/cookie-manager.js';

const COOKIE_NAME = 'mpdisclaimer';

const closeDialog = (dialog) => {
  dialog.close();
};

const setCookie = () => {
  CookieManager.set(COOKIE_NAME, 'true', 1);
};

const addContentToDialog = (dialog) => {
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('medical-policies-disclaimer-content');
  contentDiv.setAttribute('tabindex', '0');

  function appendTextOrHtml(parentElement, content) {
    const tempSpan = document.createElement('span');
    tempSpan.innerHTML = content;
    while (tempSpan.firstChild) {
      parentElement.appendChild(tempSpan.firstChild);
    }
  }

  const h3Acknowledgement = document.createElement('h3');
  h3Acknowledgement.setAttribute('aria-label', 'acknowledgement');
  h3Acknowledgement.textContent = 'Acknowledgement';
  contentDiv.appendChild(h3Acknowledgement);

  const h3MedicalPolicies = document.createElement('h3');
  h3MedicalPolicies.setAttribute('aria-label', 'medical policies');
  h3MedicalPolicies.textContent = 'Medical Policies';
  contentDiv.appendChild(h3MedicalPolicies);

  const medicalPoliciesText = `We have developed medical policies that serve as one of the sets of guidelines for coverage decisions. Benefit plans vary in coverage, and some plans may not provide coverage for certain services discussed in the medical policies. Coverage decisions are subject to all terms and conditions of the applicable benefit plan, including specific exclusions and limitations, and to applicable state and/or federal law. Medical policy does not constitute plan authorization nor is it an explanation of benefits.<br>
  <br>
  Medical policies can be highly technical and complex and are provided here for informational purposes. The medical policies do not constitute medical advice or medical care. Treating health care professionals are solely responsible for diagnosis, treatment and medical advice. Members should discuss the information in the medical policies with their treating health care professionals.<br>
  <br>
  Medical technology is constantly evolving, and these medical policies are subject to change without notice, although we will use good faith efforts to provide advance notice of changes that could have a negative impact on benefits. Additional medical policies may be developed from time to time and some may be withdrawn from use. The medical policies generally apply to all of the plan’s fully-insured benefits plans, although some local variations may exist.<br>
  <br>
  Additionally, some benefit plans administered by the plan, such as some self-funded employer plans or governmental plans, may not use the plan’s medical policy. Members should contact their local Customer Service representative for specific coverage information.<br>
  <br>
  The doctors, hospitals and other providers that are part of the network of providers referred to in this document are independent contractors who exercise independent judgment and over whom we have no control or right of control. They are not agents or employees of the plan.<br>
  <br>
  If you would like to request a hard copy of an individual medical policy, please contact the member's health plan at the number on the back of their identification card.`;

  appendTextOrHtml(contentDiv, medicalPoliciesText);

  const h3Um = document.createElement('h3');
  h3Um.textContent = 'Clinical UM Guidelines';
  contentDiv.appendChild(h3Um);

  const clinicalUmText = `We have developed clinical utilization management (UM) guidelines that serve as one of the sets of guidelines for coverage decisions. We are also licensed to use the MCG Care Guidelines to guide UM decisions. This may include but is not limited to decisions involving prior authorization, inpatient review, level of care, discharge planning and retrospective review. The MCG Care Guidelines we are licensed to use include: <em>Inpatient &amp; Surgical Care (ISC)</em>, <em>General Recovery Care (GRG)</em>, <em>Recovery Facility Care (RFC)</em>, <em>Chronic Care (CC)</em>, and <em>Behavioral Health Care Guidelines (BHG)</em>. We also have the right to customize MCG Care Guidelines based on determinations by the Medical Policy &amp; Technology Assessment Committee (MPTAC).<br>
  <br>
  Benefit plans vary in coverage and some plans may not provide coverage for certain services discussed in the clinical UM guidelines.Coverage decisions are subject to all terms and conditions of the applicable benefit plan, including specific exclusions and limitations, and to applicable state and/or federal law. A clinical UM guideline does not constitute plan authorization nor is it an explanation of benefits.<br>
  <br>
  Clinical UM guidelines can be highly technical and complex and are provided here for informational purposes. These guidelines do not constitute medical advice or medical care. Treating health care providers are solely responsible for diagnosis, treatment and medical advice. Members should discuss the information in the clinical UM guideline with their treating health care providers.<br>
  <br>
  The Clinical UM Guidelines published on this website represent the clinical UM guidelines currently available to all health plans throughout our enterprise.These guidelines address the medical necessity of existing, generally accepted services, technologies and drugs.Because local practice patterns, claims systems and benefit designs vary, a local plan may choose whether to implement a particular clinical UM guideline.While the clinical UM guidelines developed by us are published on this website, the licensed standard and customized MCG Care Guidelines are proprietary to MCG Health and are not published on the internet site.<br>
  <br>
  Medical technology is constantly evolving and clinical UM guidelines are subject to change without notice. Additional clinical UM guidelines may be developed from time to time and some may be withdrawn from use.Members should contact their local Customer Service representative for specific coverage information.<br>
  <br>
  The doctors, hospitals and other providers that are part of the network of providers referred to in this document are independent contractors who exercise independent judgment and over whom we have no control or right of control. They are not agents or employees of the plan.<br>
  <br>
  If you would like to request a hard copy of an individual clinical UM guideline or MCG Care Guideline, please contact the member's health plan at the number on the back of their identification card.`;

  appendTextOrHtml(contentDiv, clinicalUmText);
  dialog.appendChild(contentDiv);

  const section = document.createElement('section');
  section.classList.add('medical-policies-disclaimer-section');

  const pAction = document.createElement('p');
  pAction.textContent = 'By clicking on "Continue" below, I acknowledge that I have read the above.';
  section.appendChild(pAction);

  const btnContinue = document.createElement('button');
  btnContinue.classList.add('medical-policies-disclaimer-primary-btn');
  btnContinue.dataset.analytics = 'ds-id';
  btnContinue.id = 'medical-policies-disclaimer-continue';
  btnContinue.setAttribute('tabindex', '0');
  btnContinue.textContent = 'Yes, please continue';
  btnContinue.addEventListener('click', () => {
    closeDialog(dialog);
    setCookie();
  });
  section.appendChild(btnContinue);

  const btnCancel = document.createElement('button');
  btnCancel.classList.add('medical-policies-disclaimer-secondary-btn');
  btnCancel.dataset.analytics = 'ds-id';
  btnCancel.id = 'medical-policies-disclaimer-cancel';
  btnCancel.setAttribute('tabindex', '0');
  btnCancel.textContent = 'Cancel';
  btnCancel.addEventListener('click', () => {
    closeDialog(dialog);
    setCookie();
  });
  section.appendChild(btnCancel);

  dialog.appendChild(section);
};

export default function decorate(block) {
  const dialog = document.createElement('dialog');
  dialog.classList.add('medical-policies-disclaimer');
  dialog.setAttribute('role', 'alertdialog');
  dialog.setAttribute('aria-label', 'medical policies acknowledgement modal');
  dialog.setAttribute('aria-modal', 'true');

  addContentToDialog(dialog);

  block.textContent = '';
  block.append(dialog);

  if (CookieManager.get(COOKIE_NAME) === 'true') {
    return;
  }

  dialog.showModal();
}
