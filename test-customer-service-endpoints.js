#!/usr/bin/env node

const SUPABASE_URL = process.env.SUPABASE_URL || "https://tpxgfjevorhdtwkesvcb.supabase.co";
const FUNCTION_NAME = process.env.FUNCTION_NAME || "make-server-44a642d3";
const ROUTE_PREFIX = process.env.ROUTE_PREFIX || "";
const FUNCTION_URL = `${SUPABASE_URL}/functions/v1/${FUNCTION_NAME}${ROUTE_PREFIX}`;
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRweGdmamV2b3JoZHR3a2VzdmNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEyNDE3MjIsImV4cCI6MjA4NjgxNzcyMn0.K50o48WDbgmWvASexy3SCX2XfWiP_WQtCAkou49aFO8";

async function request(path, options = {}, bearerToken = ANON_KEY) {
  const headers = {
    apikey: ANON_KEY,
    Authorization: `Bearer ${bearerToken}`,
    ...(options.headers || {}),
  };

  const res = await fetch(`${FUNCTION_URL}${path}`, {
    ...options,
    headers,
  });
  let data = {};
  try {
    data = await res.json();
  } catch {
    data = { parseError: true };
  }
  return { res, data };
}

function printResult(name, ok, details = "") {
  const icon = ok ? "✅" : "❌";
  console.log(`${icon} ${name}${details ? ` - ${details}` : ""}`);
}

async function main() {
  console.log("\n🧪 Customer Service API Smoke Test\n");

  const testEmail = `cs_user_${Date.now()}@tank.local`;
  const password = "Password123";

  let passed = 0;
  let failed = 0;

  try {
    // 1) Sign up
    const signup = await request('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password,
        name: 'CS Smoke User',
        withdrawalPassword: 'Withdraw123',
        gender: 'male',
      }),
    });

    const signupOk = signup.res.status === 200 && !!signup.data.user;
    printResult('Signup test user', signupOk, `status=${signup.res.status}`);
    signupOk ? passed++ : failed++;

    if (!signupOk) {
      console.log('Response:', signup.data);
      throw new Error('Cannot continue without signup');
    }

    // 2) Sign in
    const signin = await request('/signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password }),
    });

    const accessToken = signin.data?.session?.access_token;
    const signinOk = signin.res.status === 200 && !!accessToken;
    printResult('Signin test user', signinOk, `status=${signin.res.status}`);
    signinOk ? passed++ : failed++;

    if (!signinOk) {
      console.log('Response:', signin.data);
      throw new Error('Cannot continue without access token');
    }

    const authHeaders = {
      'Content-Type': 'application/json',
    };

    // 3) Create support ticket
    const createTicket = await request('/support-tickets', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        subject: 'Smoke Test Ticket',
        category: 'technical',
        message: 'This is a smoke test for support ticket create endpoint.',
        priority: 'normal',
      }),
    }, accessToken);

    const ticketId = createTicket.data?.ticket?.id;
    const createTicketOk = createTicket.res.status === 200 && createTicket.data?.success === true && !!ticketId;
    printResult('Create support ticket', createTicketOk, `status=${createTicket.res.status}`);
    createTicketOk ? passed++ : failed++;

    // 4) List support tickets
    const listTickets = await request('/support-tickets', {
      method: 'GET',
    }, accessToken);

    const listTicketsOk =
      listTickets.res.status === 200 &&
      listTickets.data?.success === true &&
      Array.isArray(listTickets.data?.tickets) &&
      listTickets.data.tickets.some((t) => t.id === ticketId);
    printResult('List support tickets', listTicketsOk, `status=${listTickets.res.status}`);
    listTicketsOk ? passed++ : failed++;

    // 5) Get ticket detail
    const detailTicket = await request(`/support-tickets/${ticketId}`, {
      method: 'GET',
    }, accessToken);

    const detailOk = detailTicket.res.status === 200 && detailTicket.data?.success === true && detailTicket.data?.ticket?.id === ticketId;
    printResult('Get ticket detail', detailOk, `status=${detailTicket.res.status}`);
    detailOk ? passed++ : failed++;

    // 6) Reply to ticket
    const replyTicket = await request(`/support-tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ message: 'Smoke test reply message.' }),
    }, accessToken);

    const replyOk =
      replyTicket.res.status === 200 &&
      replyTicket.data?.success === true &&
      Array.isArray(replyTicket.data?.ticket?.replies) &&
      replyTicket.data.ticket.replies.length >= 1;
    printResult('Reply to ticket', replyOk, `status=${replyTicket.res.status}`);
    replyOk ? passed++ : failed++;

    // 7) Send chat message
    const conversationId = `conv_smoke_${Date.now()}`;
    const sendMsg = await request('/chat/messages', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        conversationId,
        message: 'Hello from customer-service smoke test!',
      }),
    }, accessToken);

    const sendMsgOk = sendMsg.res.status === 200 && sendMsg.data?.success === true && !!sendMsg.data?.message?.id;
    printResult('Send chat message', sendMsgOk, `status=${sendMsg.res.status}`);
    sendMsgOk ? passed++ : failed++;

    // 8) Get chat messages for conversation
    const getMsgs = await request(`/chat/messages?conversationId=${encodeURIComponent(conversationId)}`, {
      method: 'GET',
    }, accessToken);

    const getMsgsOk =
      getMsgs.res.status === 200 &&
      getMsgs.data?.success === true &&
      Array.isArray(getMsgs.data?.messages) &&
      getMsgs.data.messages.length >= 1;
    printResult('Get chat messages', getMsgsOk, `status=${getMsgs.res.status}`);
    getMsgsOk ? passed++ : failed++;

    // 9) Get FAQ list
    const faqList = await request('/faq', {
      method: 'GET',
    }, accessToken);

    const faqListOk =
      faqList.res.status === 200 &&
      faqList.data?.success === true &&
      Array.isArray(faqList.data?.faqs) &&
      faqList.data.faqs.length > 0;
    printResult('Get FAQ list', faqListOk, `status=${faqList.res.status}`);
    faqListOk ? passed++ : failed++;

    // 10) Search FAQ
    const faqSearch = await request('/faq/search?q=withdrawal', {
      method: 'GET',
    }, accessToken);

    const faqSearchOk =
      faqSearch.res.status === 200 &&
      faqSearch.data?.success === true &&
      Array.isArray(faqSearch.data?.results);
    printResult('Search FAQ', faqSearchOk, `status=${faqSearch.res.status}`);
    faqSearchOk ? passed++ : failed++;

    console.log(`\nSummary: ${passed} passed, ${failed} failed`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error('\n❌ Smoke test aborted:', error.message);
    process.exitCode = 1;
  }
}

main();
