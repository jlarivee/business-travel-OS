import { useEffect, useMemo, useState } from 'react';
import {
  BadgeDollarSign,
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarCheck,
  Check,
  CircleDollarSign,
  Clock3,
  Gauge,
  Home,
  Loader2,
  MessageCircle,
  Pause,
  Plane,
  Play,
  Plus,
  RefreshCw,
  Route,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  WalletCards,
} from 'lucide-react';
import { api } from './api';
import { cn, listText, money } from './lib/utils';

const HOME_AIRPORTS = ['BDL', 'PVD', 'HVN', 'JFK', 'LGA', 'EWR', 'BOS'];
const today = new Date().toISOString().slice(0, 10);

function nextDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const emptyWatch = {
  name: '',
  originSet: HOME_AIRPORTS,
  destinationSet: ['LHR'],
  departWindowStart: nextDate(21),
  departWindowEnd: nextDate(23),
  returnWindowStart: nextDate(26),
  returnWindowEnd: nextDate(28),
  cabin: 'business',
  passengers: 1,
  maxPrice: 3500,
  notes: '',
};

function Section({ title, eyebrow, action, children, className }) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface/92 p-4 shadow-soft md:p-5', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber">{eyebrow}</p>}
          <h2 className="mt-1 text-lg font-semibold text-text">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Button({ children, tone = 'default', className, icon: Icon, loading, ...props }) {
  const tones = {
    default: 'border-amber/30 bg-amber text-bg hover:bg-amber/90',
    quiet: 'border-line bg-panel text-text hover:border-sky/40 hover:bg-panel/80',
    ghost: 'border-transparent bg-transparent text-muted hover:bg-panel hover:text-text',
    danger: 'border-red/35 bg-red/10 text-red hover:bg-red/15',
    success: 'border-green/35 bg-green/10 text-green hover:bg-green/15',
  };
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        tones[tone],
        className,
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-quiet">{label}</span>
      {children}
    </label>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className={cn('w-full rounded-md border border-line bg-bg/80 px-3 py-2.5 text-sm text-text placeholder:text-quiet focus:border-sky', props.className)}
    />
  );
}

function Textarea(props) {
  return (
    <textarea
      {...props}
      className={cn('min-h-24 w-full rounded-md border border-line bg-bg/80 px-3 py-2.5 text-sm text-text placeholder:text-quiet focus:border-sky', props.className)}
    />
  );
}

function Select(props) {
  return (
    <select
      {...props}
      className={cn('w-full rounded-md border border-line bg-bg/80 px-3 py-2.5 text-sm text-text focus:border-sky', props.className)}
    />
  );
}

function Metric({ label, value, icon: Icon, tone = 'sky' }) {
  const colors = {
    sky: 'text-sky bg-sky/10',
    amber: 'text-amber bg-amber/10',
    green: 'text-green bg-green/10',
    violet: 'text-violet bg-violet/10',
  };
  return (
    <div className="rounded-lg border border-line bg-panel p-3">
      <div className="flex items-center gap-2">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-md', colors[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-quiet">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-text">{value}</p>
    </div>
  );
}

function FareTable({ results = [], onSaveItinerary }) {
  if (!results.length) {
    return <p className="rounded-md border border-line bg-panel p-4 text-sm text-muted">No fare leads yet.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="min-w-[860px] w-full text-left text-sm">
        <thead className="bg-panel text-xs uppercase tracking-[0.14em] text-quiet">
          <tr>
            <th className="px-3 py-3">Airline</th>
            <th className="px-3 py-3">Route</th>
            <th className="px-3 py-3">Coach reimbursed</th>
            <th className="px-3 py-3">Premium fare</th>
            <th className="px-3 py-3">Your out-of-pocket</th>
            <th className="px-3 py-3">Membership fit</th>
            <th className="px-3 py-3">Source</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line bg-bg/50">
          {results.map((result, index) => (
            <tr key={`${result.sourceUrl}-${index}`} className="align-top">
              <td className="px-3 py-3 font-semibold text-text">{result.airline}</td>
              <td className="px-3 py-3 text-muted">
                <span className="block text-text">{result.route}</span>
                <span className="text-xs">{result.departDate}{result.returnDate ? ` to ${result.returnDate}` : ''}</span>
              </td>
              <td className="px-3 py-3 text-muted">{money(result.coachReimbursed, result.currency)}</td>
              <td className="px-3 py-3 font-semibold text-text">{money(result.premiumFare, result.currency)}</td>
              <td className="px-3 py-3 font-semibold text-amber">{money(result.outOfPocket, result.currency)}</td>
              <td className="px-3 py-3 text-muted">{result.membershipFit || 'No direct match'}</td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-2">
                  <a className="text-sky hover:text-sky/80" href={result.sourceUrl} target="_blank" rel="noreferrer">Open</a>
                  {onSaveItinerary && (
                    <button className="text-green hover:text-green/80" onClick={() => onSaveItinerary(result)}>Save</button>
                  )}
                </div>
                <p className="mt-1 max-w-xs text-xs text-quiet">{result.confidence}. {result.notes}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WatchForm({ value, onChange, onSubmit, loading }) {
  const update = (key, next) => onChange({ ...value, [key]: next });
  return (
    <form
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Field label="Watch name">
        <Input value={value.name} placeholder="London September board meeting" onChange={(event) => update('name', event.target.value)} />
      </Field>
      <Field label="Origins">
        <Input value={listText(value.originSet)} onChange={(event) => update('originSet', event.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean))} />
      </Field>
      <Field label="Destinations">
        <Input value={listText(value.destinationSet)} onChange={(event) => update('destinationSet', event.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean))} />
      </Field>
      <Field label="Cabin">
        <Select value={value.cabin} onChange={(event) => update('cabin', event.target.value)}>
          <option value="business">Business</option>
          <option value="first">First</option>
          <option value="premium economy">Premium economy</option>
          <option value="economy">Economy</option>
        </Select>
      </Field>
      <Field label="Depart start">
        <Input type="date" value={value.departWindowStart} onChange={(event) => update('departWindowStart', event.target.value)} />
      </Field>
      <Field label="Depart end">
        <Input type="date" value={value.departWindowEnd} onChange={(event) => update('departWindowEnd', event.target.value)} />
      </Field>
      <Field label="Return start">
        <Input type="date" value={value.returnWindowStart || ''} onChange={(event) => update('returnWindowStart', event.target.value)} />
      </Field>
      <Field label="Return end">
        <Input type="date" value={value.returnWindowEnd || ''} onChange={(event) => update('returnWindowEnd', event.target.value)} />
      </Field>
      <Field label="Passengers">
        <Input type="number" min="1" value={value.passengers} onChange={(event) => update('passengers', Number(event.target.value))} />
      </Field>
      <Field label="Max premium fare">
        <Input type="number" min="1" value={value.maxPrice} onChange={(event) => update('maxPrice', Number(event.target.value))} />
      </Field>
      <Field label="Notes">
        <Input value={value.notes} placeholder="Must arrive before 2 PM" onChange={(event) => update('notes', event.target.value)} />
      </Field>
      <div className="flex items-end">
        <Button className="w-full" icon={Plus} loading={loading}>Create watch</Button>
      </div>
    </form>
  );
}

function CommandCenter({ bundle, onRefresh }) {
  const [searchForm, setSearchForm] = useState({
    originOptions: bundle.profile?.homeAirports || HOME_AIRPORTS,
    destinationOptions: ['LHR'],
    departDate: nextDate(21),
    returnDate: nextDate(25),
    cabin: bundle.profile?.defaultCabin || 'business',
    passengers: 1,
  });
  const [searchResult, setSearchResult] = useState(null);
  const [busy, setBusy] = useState('');
  const hits = bundle.hits || [];
  const watches = bundle.watches || [];
  const latestReview = bundle.dailyReviews?.[0];
  const bestHits = [...hits].sort((a, b) => (a.outOfPocket ?? a.premiumFare) - (b.outOfPocket ?? b.premiumFare)).slice(0, 5);

  async function runSearch() {
    setBusy('search');
    try {
      const result = await api.searchFlights(searchForm);
      setSearchResult(result);
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  async function saveItinerary(result) {
    setBusy('itinerary');
    try {
      await api.createItinerary({
        title: `${result.airline} ${result.route}`,
        city: result.destination,
        startDate: result.departDate || today,
        endDate: result.returnDate || result.departDate || today,
        sourceHitId: result.id,
        notes: `Premium ${money(result.premiumFare, result.currency)}, coach reimbursed ${money(result.coachReimbursed, result.currency)}, your out-of-pocket ${money(result.outOfPocket, result.currency)}.`,
        payload: result,
      });
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  async function createReview() {
    setBusy('review');
    try {
      await api.createDailyReview();
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  const update = (key, value) => setSearchForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric label="Active watches" value={watches.filter((watch) => watch.active).length} icon={Gauge} tone="sky" />
        <Metric label="Fare leads" value={hits.length} icon={BadgeDollarSign} tone="amber" />
        <Metric label="Saved trips" value={bundle.itinerary?.length || 0} icon={CalendarCheck} tone="green" />
        <Metric label="Memberships" value={bundle.memberships?.length || 0} icon={WalletCards} tone="violet" />
      </div>

      <Section
        title="Executive travel review"
        eyebrow="Daily"
        action={<Button tone="quiet" icon={RefreshCw} loading={busy === 'review'} onClick={createReview}>Run review</Button>}
      >
        {latestReview ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{latestReview.summary}</p>
            <div className="grid gap-2 md:grid-cols-2">
              {(latestReview.payload?.recommendations || []).map((item) => (
                <div key={item} className="rounded-md border border-line bg-panel p-3 text-sm text-text">{item}</div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">No review yet. Run one after creating a watch or search.</p>
        )}
      </Section>

      <Section title="Fast fare research" eyebrow="Premium with coach reimbursement">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Field label="Origins">
            <Input value={listText(searchForm.originOptions)} onChange={(event) => update('originOptions', event.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean))} />
          </Field>
          <Field label="Destinations">
            <Input value={listText(searchForm.destinationOptions)} onChange={(event) => update('destinationOptions', event.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean))} />
          </Field>
          <Field label="Depart">
            <Input type="date" value={searchForm.departDate} onChange={(event) => update('departDate', event.target.value)} />
          </Field>
          <Field label="Return">
            <Input type="date" value={searchForm.returnDate} onChange={(event) => update('returnDate', event.target.value)} />
          </Field>
          <Field label="Cabin">
            <Select value={searchForm.cabin} onChange={(event) => update('cabin', event.target.value)}>
              <option value="business">Business</option>
              <option value="first">First</option>
              <option value="premium economy">Premium economy</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button className="w-full" icon={Search} loading={busy === 'search'} onClick={runSearch}>Search</Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-quiet">Research leads only. Confirm fares directly before buying.</p>
        {searchResult && (
          <div className="mt-4">
            <FareTable results={searchResult.results} onSaveItinerary={saveItinerary} />
          </div>
        )}
      </Section>

      <Section title="Best saved fare leads" eyebrow="Needs decision">
        <FareTable results={bestHits} onSaveItinerary={saveItinerary} />
      </Section>
    </div>
  );
}

function WatchesPage({ bundle, onRefresh }) {
  const [form, setForm] = useState(emptyWatch);
  const [busy, setBusy] = useState('');
  const watches = bundle.watches || [];
  const hitsByWatch = useMemo(() => {
    const map = new Map();
    for (const hit of bundle.hits || []) {
      map.set(hit.watchId, [...(map.get(hit.watchId) || []), hit]);
    }
    return map;
  }, [bundle.hits]);

  async function submit() {
    setBusy('create');
    try {
      await api.createWatch(form);
      setForm(emptyWatch);
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  async function toggle(watch) {
    setBusy(`toggle-${watch.id}`);
    try {
      await api.updateWatch(watch.id, { active: !watch.active });
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  async function check(watch) {
    setBusy(`check-${watch.id}`);
    try {
      await api.checkWatch(watch.id);
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  async function remove(watch) {
    setBusy(`delete-${watch.id}`);
    try {
      await api.deleteWatch(watch.id);
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <Section title="Create watch" eyebrow="Every four hours">
        <WatchForm value={form} onChange={setForm} onSubmit={submit} loading={busy === 'create'} />
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        {watches.map((watch) => {
          const hits = hitsByWatch.get(watch.id) || [];
          return (
            <Section
              key={watch.id}
              title={watch.name}
              eyebrow={watch.active ? 'Active watch' : 'Paused watch'}
              action={
                <div className="flex flex-wrap gap-2">
                  <Button tone="quiet" icon={RefreshCw} loading={busy === `check-${watch.id}`} onClick={() => check(watch)}>Check</Button>
                  <Button tone={watch.active ? 'ghost' : 'success'} icon={watch.active ? Pause : Play} loading={busy === `toggle-${watch.id}`} onClick={() => toggle(watch)}>
                    {watch.active ? 'Pause' : 'Resume'}
                  </Button>
                  <Button tone="danger" icon={Trash2} loading={busy === `delete-${watch.id}`} onClick={() => remove(watch)}>Delete</Button>
                </div>
              }
            >
              <div className="mb-4 grid gap-2 text-sm text-muted md:grid-cols-2">
                <p><span className="text-quiet">Route:</span> {listText(watch.originSet)} to {listText(watch.destinationSet)}</p>
                <p><span className="text-quiet">Cabin:</span> {watch.cabin}</p>
                <p><span className="text-quiet">Depart:</span> {watch.departWindowStart} to {watch.departWindowEnd}</p>
                <p><span className="text-quiet">Max premium fare:</span> {money(watch.maxPrice)}</p>
                <p><span className="text-quiet">Last checked:</span> {watch.lastCheckedAt ? new Date(watch.lastCheckedAt).toLocaleString() : 'Not yet'}</p>
                <p><span className="text-quiet">Hits:</span> {hits.length}</p>
              </div>
              <FareTable results={hits.slice(0, 4)} />
            </Section>
          );
        })}
      </div>
    </div>
  );
}

function ProfilePage({ bundle, onRefresh }) {
  const [profile, setProfile] = useState(bundle.profile);
  const [newMembership, setNewMembership] = useState({ program: '', accountNumber: '', tier: '', notes: '' });
  const [busy, setBusy] = useState('');

  useEffect(() => {
    setProfile(bundle.profile);
  }, [bundle.profile]);

  if (!profile) return null;

  async function saveProfile() {
    setBusy('profile');
    try {
      await api.updateProfile(profile);
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  async function addMembership() {
    if (!newMembership.program.trim()) return;
    setBusy('membership-add');
    try {
      await api.createMembership(newMembership);
      setNewMembership({ program: '', accountNumber: '', tier: '', notes: '' });
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  async function updateMembership(membership, data) {
    setBusy(`membership-${membership.id}`);
    try {
      await api.updateMembership(membership.id, { ...membership, ...data });
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  async function deleteMembership(membership) {
    setBusy(`membership-${membership.id}`);
    try {
      await api.deleteMembership(membership.id);
      await onRefresh();
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="space-y-4">
      <Section
        title="Executive profile"
        eyebrow="Single user"
        action={<Button icon={Save} loading={busy === 'profile'} onClick={saveProfile}>Save profile</Button>}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name">
            <Input value={profile.name || ''} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
          </Field>
          <Field label="Title">
            <Input value={profile.title || ''} onChange={(event) => setProfile({ ...profile, title: event.target.value })} />
          </Field>
          <Field label="Location">
            <Input value={profile.location || ''} onChange={(event) => setProfile({ ...profile, location: event.target.value })} />
          </Field>
          <Field label="Default cabin">
            <Select value={profile.defaultCabin || 'business'} onChange={(event) => setProfile({ ...profile, defaultCabin: event.target.value })}>
              <option value="business">Business</option>
              <option value="first">First</option>
              <option value="premium economy">Premium economy</option>
            </Select>
          </Field>
          <Field label="Home airports">
            <Input value={listText(profile.homeAirports)} onChange={(event) => setProfile({ ...profile, homeAirports: event.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean) })} />
          </Field>
          <Field label="Notify channels">
            <div className="flex flex-wrap gap-2 rounded-md border border-line bg-bg/80 p-2.5 text-sm">
              {['console', 'email', 'sms', 'slack'].map((channel) => (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setProfile({
                    ...profile,
                    notifyChannels: {
                      ...(profile.notifyChannels || {}),
                      [channel]: !(profile.notifyChannels || {})[channel],
                    },
                  })}
                  className={cn(
                    'rounded-md border px-3 py-1.5 capitalize',
                    profile.notifyChannels?.[channel] ? 'border-green/40 bg-green/10 text-green' : 'border-line text-muted',
                  )}
                >
                  {channel}
                </button>
              ))}
            </div>
          </Field>
          <div className="md:col-span-2">
            <Field label="Reimbursement policy">
              <Textarea value={profile.reimbursementPolicy || ''} onChange={(event) => setProfile({ ...profile, reimbursementPolicy: event.target.value })} />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="Memberships" eyebrow="Airline fit">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_0.8fr_0.8fr_auto]">
          <Input placeholder="Program" value={newMembership.program} onChange={(event) => setNewMembership({ ...newMembership, program: event.target.value })} />
          <Input placeholder="Account number" value={newMembership.accountNumber} onChange={(event) => setNewMembership({ ...newMembership, accountNumber: event.target.value })} />
          <Input placeholder="Tier" value={newMembership.tier} onChange={(event) => setNewMembership({ ...newMembership, tier: event.target.value })} />
          <Button icon={Plus} loading={busy === 'membership-add'} onClick={addMembership}>Add</Button>
        </div>
        <div className="space-y-2">
          {(bundle.memberships || []).map((membership) => (
            <div key={membership.id} className="grid gap-2 rounded-lg border border-line bg-panel p-3 md:grid-cols-[1fr_0.8fr_0.8fr_1.4fr_auto]">
              <Input value={membership.program} onChange={(event) => updateMembership(membership, { program: event.target.value })} />
              <Input value={membership.accountNumber || ''} placeholder="Account" onChange={(event) => updateMembership(membership, { accountNumber: event.target.value })} />
              <Input value={membership.tier || ''} placeholder="Tier" onChange={(event) => updateMembership(membership, { tier: event.target.value })} />
              <Input value={membership.notes || ''} placeholder="Notes" onChange={(event) => updateMembership(membership, { notes: event.target.value })} />
              <Button tone="danger" icon={Trash2} loading={busy === `membership-${membership.id}`} onClick={() => deleteMembership(membership)}>Remove</Button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Ask me to search premium fares, create a watch, check a watch, or review memberships. I will always show coach reimbursed, premium fare, and your out-of-pocket.',
    },
  ]);
  const [input, setInput] = useState('Find business class options from JFK or EWR to LHR in September under $3500.');
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!input.trim()) return;
    const userText = input.trim();
    setMessages((current) => [...current, { role: 'user', content: userText }]);
    setInput('');
    setBusy(true);
    try {
      const result = await api.sendChat(userText);
      setMessages((current) => [...current, { role: 'assistant', content: result.message, toolCalls: result.toolCalls }]);
    } catch (error) {
      setMessages((current) => [...current, { role: 'assistant', content: error.message }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section title="Travel agent" eyebrow="Tool-enabled chat" className="min-h-[70svh]">
      <div className="flex min-h-[58svh] flex-col">
        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                'max-w-3xl rounded-lg border p-3 text-sm leading-6',
                message.role === 'user' ? 'ml-auto border-amber/30 bg-amber/10 text-text' : 'border-line bg-panel text-muted',
              )}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              {message.toolCalls?.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-quiet">
                  {message.toolCalls.map((tool, toolIndex) => (
                    <p key={`${tool.name}-${toolIndex}`}><Sparkles className="mr-1 inline h-3 w-3" />{tool.name}</p>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && <div className="rounded-lg border border-line bg-panel p-3 text-sm text-muted">Working with travel tools...</div>}
        </div>
        <div className="flex gap-2 border-t border-line pt-3">
          <Input value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && send()} />
          <Button icon={MessageCircle} loading={busy} onClick={send}>Send</Button>
        </div>
      </div>
    </Section>
  );
}

function AppShell({ page, setPage, children, bundle, health }) {
  const nav = [
    { id: 'command', label: 'Command', icon: Home },
    { id: 'watches', label: 'Watches', icon: Bell },
    { id: 'profile', label: 'Profile', icon: Settings },
    { id: 'chat', label: 'Chat', icon: Bot },
  ];
  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="border-b border-line/80 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber text-bg">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-text">Business Travel OS</h1>
              <p className="truncate text-xs text-muted">{bundle.profile?.name || 'Josh Larivee'} · {listText(bundle.profile?.homeAirports || [])}</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 md:flex">
            <span className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs text-muted">
              <ShieldCheck className="h-4 w-4 text-green" />
              {health?.database?.mode || 'loading'}
            </span>
            <span className="inline-flex items-center gap-2 rounded-md border border-line bg-panel px-3 py-2 text-xs text-muted">
              <Clock3 className="h-4 w-4 text-sky" />
              4-hour watch loop
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-4 md:grid-cols-[220px_1fr]">
        <aside className="hidden md:block">
          <nav className="sticky top-4 space-y-2 rounded-lg border border-line bg-surface/92 p-2">
            {nav.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm font-semibold transition-colors',
                    page === item.id ? 'bg-amber text-bg' : 'text-muted hover:bg-panel hover:text-text',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <main>{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-2 py-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-md px-2 py-2 text-[11px] font-semibold',
                  page === item.id ? 'bg-amber text-bg' : 'text-muted',
                )}
              >
                <Icon className="mb-1 h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('command');
  const [bundle, setBundle] = useState(null);
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  async function load() {
    setError('');
    try {
      const [healthResult, profileResult] = await Promise.all([
        api.health(),
        api.getProfile(),
      ]);
      setHealth(healthResult);
      setBundle(profileResult);
    } catch (loadError) {
      setError(loadError.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="max-w-lg rounded-lg border border-red/35 bg-red/10 p-5 text-text">
          <h1 className="text-lg font-semibold">App could not load</h1>
          <p className="mt-2 text-sm text-muted">{error}</p>
          <Button className="mt-4" tone="quiet" icon={RefreshCw} onClick={load}>Retry</Button>
        </div>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber" />
      </div>
    );
  }

  const pages = {
    command: <CommandCenter bundle={bundle} onRefresh={load} />,
    watches: <WatchesPage bundle={bundle} onRefresh={load} />,
    profile: <ProfilePage bundle={bundle} onRefresh={load} />,
    chat: <ChatPage />,
  };

  return (
    <AppShell page={page} setPage={setPage} bundle={bundle} health={health}>
      <div className="mb-4 grid gap-3 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="rounded-lg border border-line bg-surface/92 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky/10 text-sky">
              <Plane className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber">Premium travel research</p>
              <h2 className="mt-1 text-2xl font-semibold text-text">Find executive-appropriate fares and show what you personally pay.</h2>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Every result separates coach reimbursed, premium fare, and your out-of-pocket. Emirates, Virgin Atlantic, and partner programs are treated as first-class preferences, not afterthoughts.
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-quiet">Current rule</p>
          <p className="mt-2 text-sm text-muted">{bundle.profile?.reimbursementPolicy}</p>
        </div>
      </div>
      {pages[page]}
    </AppShell>
  );
}
