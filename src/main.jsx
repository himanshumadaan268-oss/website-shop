
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Search, MapPin, ArrowUpRight, SlidersHorizontal, Heart,
  BedDouble, Bath, Maximize, MessageCircle, Menu, X,
  Building2, KeyRound, LandPlot, Store, BriefcaseBusiness,
  Home, ShieldCheck, Sparkles, CheckCircle2, ArrowLeft, ChevronDown
} from "lucide-react";
import "./styles.css";

const API_URL = "https://website-shop-ibh3.onrender.com/api";
const whatsappNumber = "91XXXXXXXXXX"; // Replace with your real WhatsApp number.

const categories = [
  ["All", "All properties", Building2],
  ["House", "Houses", Home],
  ["Flat", "Flats", Building2],
  ["Plot", "Plots", LandPlot],
  ["Shop", "Shops", Store],
  ["Office", "Offices", BriefcaseBusiness]
];

// Convert a MySQL record into the format used by the existing website.
function fromDatabase(p) {
  const price = Number(p.price) || 0;

  return {
    ...p,
    id: Number(p.id),
    type: p.property_type,
    status: p.listing_type === "Sale" ? "For Sale" : "For Rent",
    price,
    priceLabel: new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(price),
    image: p.image_url || "",
    area: p.area_sqft ? `${Number(p.area_sqft)} sq ft` : "",
    beds: Number(p.bedrooms) || 0,
    baths: Number(p.bathrooms) || 0,
    description: p.description || "",
    tags: []
  };
}

// Convert the admin form into the database format.
function toDatabase(p) {
  const areaText = String(p.area || "").trim();
  const area = areaText === "" ? 0 : Number(areaText);

  if (!Number.isFinite(area) || area < 0) {
    throw new Error("Area must be a numeric value in square feet.");
  }

  return {
    title: p.title.trim(),
    property_type: p.type,
    listing_type: p.status === "For Sale" ? "Sale" : "Rent",
    price: Number(p.price),
    location: p.location.trim(),
    description: p.description || "",
    image_url: p.image || "",
    bedrooms: Number(p.beds) || 0,
    bathrooms: Number(p.baths) || 0,
    area_sqft: area,
    status: "Available"
  };
}

function App() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [purpose, setPurpose] = useState("Any purpose");
  const [budget, setBudget] = useState("Any budget");
  const [sort, setSort] = useState("Recommended");
  const [selected, setSelected] = useState(null);
  const [menu, setMenu] = useState(false);
  const [saved, setSaved] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const blankProperty = {
    title: "",
    type: "House",
    status: "For Sale",
    price: "",
    priceLabel: "",
    location: "",
    area: "",
    beds: "",
    baths: "",
    image: "",
    description: "",
    tags: []
  };

  const [form, setForm] = useState(blankProperty);

  // Load all property records from MySQL on startup.
  async function loadProperties() {
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/properties`);

      if (!response.ok) {
        throw new Error("Could not load properties from the server.");
      }

      const data = await response.json();
      console.log("Properties received from API:", data);
      setProperties(data.map(fromDatabase));
    } catch (error) {
      console.error(error);
      setNotice(
        "Could not connect to the property API. Check that your backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProperties();
  }, []);

  const openAdmin = () => {
    if (!loggedIn) {
      const pass = window.prompt(
        "Demo admin password. This is not secure for a public website:"
      );

      if (pass !== "tony123") {
        if (pass !== null) window.alert("Incorrect demo password.");
        return;
      }

      setLoggedIn(true);
    }

    setAdmin(true);
    setSelected(null);
    setEditing(null);
    setForm(blankProperty);
    setNotice("");
  };

  const startEdit = (p) => {
    setEditing(p.id);

    setForm({
      ...blankProperty,
      ...p,
      price: String(p.price),
      beds: p.beds ? String(p.beds) : "",
      baths: p.baths ? String(p.baths) : "",
      area: p.area ? String(Number(p.area.replace(/ sq ft$/, ""))) : "",
      tags: p.tags || []
    });

    setNotice("");
  };

  // Add a new record or update an existing record in MySQL.
  const submitProperty = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice("");

    try {
      const payload = toDatabase(form);
      const url = editing
        ? `${API_URL}/properties/${editing}`
        : `${API_URL}/properties`;

      const response = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save property.");
      }

      const savedProperty = fromDatabase(data);

      setProperties((current) =>
        editing
          ? current.map((p) =>
              p.id === editing ? savedProperty : p
            )
          : [savedProperty, ...current]
      );

      setEditing(null);
      setForm(blankProperty);
      setNotice(
        editing
          ? "Property updated successfully in MySQL."
          : "Property added successfully to MySQL."
      );
    } catch (error) {
      console.error(error);
      setNotice(error.message || "Could not save the property.");
    } finally {
      setBusy(false);
    }
  };

  // Delete a property from MySQL.
  const deleteProperty = async (id) => {
    if (!window.confirm("Delete this listing permanently?")) return;

    setNotice("");

    try {
      const response = await fetch(`${API_URL}/properties/${id}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete property.");
      }

      setProperties((current) => current.filter((p) => p.id !== id));

      if (selected?.id === id) setSelected(null);

      setNotice("Property deleted from MySQL.");
    } catch (error) {
      console.error(error);
      setNotice(error.message || "Could not delete property.");
    }
  };

  const filtered = useMemo(() => {
    let list = properties.filter((p) => {
      const q = search.trim().toLowerCase();

      return (
        (!q ||
          [p.title, p.type, p.location, p.status].some((value) =>
            String(value || "").toLowerCase().includes(q)
          )) &&
        (category === "All" || p.type === category) &&
        (purpose === "Any purpose" || p.status === purpose) &&
        (budget === "Any budget" ||
          (budget === "Under ₹25 Lakh" && p.price < 2500000) ||
          (budget === "₹25–75 Lakh" &&
            p.price >= 2500000 &&
            p.price <= 7500000) ||
          (budget === "₹75 Lakh+" && p.price > 7500000))
      );
    });

    if (sort === "Price: low to high") {
      list = [...list].sort((a, b) => a.price - b.price);
    }

    if (sort === "Price: high to low") {
      list = [...list].sort((a, b) => b.price - a.price);
    }

    return list;
  }, [properties, search, category, purpose, budget, sort]);

  const wa = (p) =>
    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
      `Hello Tony Mobile And Property Dealers, I'm interested in ${
        p?.title || "a property"
      } in ${p?.location || "Jalandhar"}. Please share details.`
    )}`;

  const reset = () => {
    setSearch("");
    setCategory("All");
    setPurpose("Any purpose");
    setBudget("Any budget");
    setSort("Recommended");
  };

  const goListings = () => {
    setSelected(null);
    document.getElementById("properties")?.scrollIntoView({
      behavior: "smooth"
    });
  };

  return (
    <div className="app">
      <header className="header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setSelected(null);
            setAdmin(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <span className="brand-icon"><Building2 /></span>
          <span>
            <b>Tony <em>Property</em></b>
            <small>MOBILE AND PROPERTY DEALERS</small>
          </span>
        </a>

        <nav className={menu ? "nav open" : "nav"}>
          <a href="#properties" onClick={() => setMenu(false)}>Properties</a>
          <a href="#approach" onClick={() => setMenu(false)}>Our approach</a>
          <a href="#about" onClick={() => setMenu(false)}>About us</a>
          <button
            className="admin-nav"
            onClick={() => {
              setMenu(false);
              openAdmin();
            }}
          >
            Admin panel
          </button>
          <a className="nav-cta" href="#contact" onClick={() => setMenu(false)}>
            Contact <ArrowUpRight size={16} />
          </a>
        </nav>

        <button
          className="menu-btn"
          onClick={() => setMenu(!menu)}
          aria-label="Toggle menu"
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>

      {admin ? (
        <main className="admin-page section">
          <div className="admin-top">
            <div>
              <div className="eyebrow">TONY PROPERTY · MANAGEMENT</div>
              <h1>Property admin</h1>
              <p>Add new listings or update existing properties in the shared database.</p>
            </div>
            <button
              className="back"
              onClick={() => {
                setAdmin(false);
                setNotice("");
              }}
            >
              <ArrowLeft size={16} /> Back to website
            </button>
          </div>

          <div className="admin-warning">
            <ShieldCheck />
            <span>
              <b>Admin security:</b> The current password prompt is only a demo.
              Add server-side authentication before publishing this website.
            </span>
          </div>

          <div className="admin-layout">
            <form className="admin-form" onSubmit={submitProperty}>
              <h2>{editing ? "Edit property" : "Add a property"}</h2>

              <label>
                Property title
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. 3-bedroom family home"
                />
              </label>

              <div className="admin-fields">
                <label>
                  Type
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {["House", "Flat", "Plot", "Shop", "Office", "Commercial", "Other"].map(
                      (x) => <option key={x}>{x}</option>
                    )}
                  </select>
                </label>

                <label>
                  Purpose
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option>For Sale</option>
                    <option>For Rent</option>
                  </select>
                </label>
              </div>

              <div className="admin-fields">
                <label>
                  Price (₹)
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    placeholder="e.g. 4500000"
                  />
                </label>

                <label>
                  Price display (optional)
                  <input
                    value={form.priceLabel}
                    onChange={(e) => setForm({ ...form, priceLabel: e.target.value })}
                    placeholder="e.g. ₹45 Lakh"
                  />
                </label>
              </div>

              <label>
                Location
                <input
                  required
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  placeholder="Area, Jalandhar"
                />
              </label>

              <div className="admin-fields">
                <label>
                  Area (square feet)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.area}
                    onChange={(e) => setForm({ ...form, area: e.target.value })}
                    placeholder="e.g. 1200"
                  />
                </label>

                <label>
                  Bedrooms
                  <input
                    type="number"
                    min="0"
                    value={form.beds}
                    onChange={(e) => setForm({ ...form, beds: e.target.value })}
                  />
                </label>
              </div>

              <label>
                Bathrooms
                <input
                  type="number"
                  min="0"
                  value={form.baths}
                  onChange={(e) => setForm({ ...form, baths: e.target.value })}
                />
              </label>

              <label>
                Photo URL
                <input
                  required
                  type="url"
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://..."
                />
              </label>

              <label>
                Description
                <textarea
                  rows="4"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the property and important details"
                />
              </label>

              <div className="admin-actions">
                <button className="primary" type="submit" disabled={busy}>
                  {busy
                    ? "Saving..."
                    : editing
                    ? "Save changes"
                    : "Add property"}
                </button>

                {editing && (
                  <button
                    type="button"
                    className="clear"
                    onClick={() => {
                      setEditing(null);
                      setForm(blankProperty);
                      setNotice("");
                    }}
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              {notice && <p className="admin-notice">{notice}</p>}
            </form>

            <div className="admin-list">
              <div className="admin-list-head">
                <h2>Listings <span>{properties.length}</span></h2>
                <p>Select a listing to edit or remove it.</p>
                <button type="button" className="clear" onClick={loadProperties}>
                  Refresh listings
                </button>
              </div>

              {loading ? (
                <p>Loading properties...</p>
              ) : properties.length === 0 ? (
                <p>No properties yet. Add your first listing using the form.</p>
              ) : (
                properties.map((p) => (
                  <div className="admin-row" key={p.id}>
                    <img src={p.image} alt={p.title} />
                    <div className="admin-row-info">
                      <b>{p.title}</b>
                      <small>{p.location}</small>
                      <strong>{p.priceLabel}</strong>
                    </div>
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => startEdit(p)}>Edit</button>
                      <button type="button" onClick={() => deleteProperty(p.id)}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      ) : selected ? (
        <main className="detail section">
          <button className="back" onClick={() => setSelected(null)}>
            <ArrowLeft size={16} /> Back to properties
          </button>

          <div className="detail-grid">
            <div className="detail-image">
              <img src={selected.image} alt={selected.title} />
            </div>

            <div className="detail-copy">
              <div className="eyebrow">{selected.status} · {selected.type}</div>
              <h1>{selected.title}</h1>
              <p className="location"><MapPin size={16} />{selected.location}</p>
              <div className="detail-price">{selected.priceLabel}</div>

              <div className="specs">
                {selected.area && (
                  <div><Maximize /><b>{selected.area}</b><small>Area</small></div>
                )}
                {selected.beds > 0 && (
                  <div><BedDouble /><b>{selected.beds} bedrooms</b><small>Bedrooms</small></div>
                )}
                {selected.baths > 0 && (
                  <div><Bath /><b>{selected.baths} bathrooms</b><small>Bathrooms</small></div>
                )}
              </div>

              <h3>About this property</h3>
              <p className="description">{selected.description || "Contact us for more details about this property."}</p>

              <a className="primary wide" href={wa(selected)} target="_blank" rel="noreferrer">
                <MessageCircle /> Ask about this listing <ArrowUpRight />
              </a>
              <p className="tiny">Please confirm property details and availability with the business.</p>
            </div>
          </div>
        </main>
      ) : (
        <main>
          <section className="hero">
            <div className="hero-copy">
              <div className="pill"><Sparkles size={14} /> YOUR NEXT MOVE STARTS HERE</div>
              <h1>Find a place<br />to <em>belong.</em></h1>
              <p>Thoughtful property guidance for buying, selling and renting in Jalandhar and beyond.</p>

              <div className="hero-search">
                <Search />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search area, property or keyword..."
                  aria-label="Search properties"
                />
                <button onClick={goListings}>Search <ArrowUpRight size={16} /></button>
              </div>

              <div className="proof">
                <span><CheckCircle2 /> Local property guidance</span>
                <span><CheckCircle2 /> Clear communication</span>
              </div>
            </div>

            <div className="hero-art">
              <img
                src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1400&q=90"
                alt="Home inspiration"
              />
              <div className="image-caption">
                <small>SPACES WITH POSSIBILITY</small>
                <b>Make your next move count.</b>
              </div>
              <div className="float-card">
                <span><KeyRound /></span>
                <div><b>Buy · Sell · Rent</b><small>Property, made simpler</small></div>
              </div>
              <div className="hero-index">
                <b>01</b><small>YOUR LOCAL<br />PROPERTY PARTNER</small>
              </div>
            </div>
            <div className="vertical-label">JALANDHAR · PUNJAB</div>
          </section>

          <section className="trust">
            <div><Home /><span><b>Residential</b><small>Homes & apartments</small></span></div>
            <div><LandPlot /><span><b>Land & plots</b><small>Room to build</small></span></div>
            <div><Store /><span><b>Commercial</b><small>Shops & offices</small></span></div>
            <div><KeyRound /><span><b>Rentals</b><small>Find your fit</small></span></div>
          </section>

          <section className="section listings" id="properties">
            <div className="section-head">
              <div>
                <div className="eyebrow">OUR LISTINGS</div>
                <h2>Explore properties<span>.</span></h2>
                <p>Browse properties available through Tony Mobile And Property Dealers.</p>
              </div>
              <button className="filter-toggle" onClick={() => setFiltersOpen(!filtersOpen)}>
                <SlidersHorizontal /> Filters <ChevronDown />
              </button>
            </div>

            <div className="categories">
              {categories.map(([val, label, Icon]) => (
                <button
                  key={val}
                  className={category === val ? "cat active" : "cat"}
                  onClick={() => setCategory(val)}
                >
                  <Icon size={16} />{label}
                </button>
              ))}
            </div>

            <div className={filtersOpen ? "filters show" : "filters"}>
              <label>
                Purpose
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option>Any purpose</option>
                  <option>For Sale</option>
                  <option>For Rent</option>
                </select>
              </label>
              <label>
                Budget
                <select value={budget} onChange={(e) => setBudget(e.target.value)}>
                  <option>Any budget</option>
                  <option>Under ₹25 Lakh</option>
                  <option>₹25–75 Lakh</option>
                  <option>₹75 Lakh+</option>
                </select>
              </label>
              <label>
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option>Recommended</option>
                  <option>Price: low to high</option>
                  <option>Price: high to low</option>
                </select>
              </label>
              <button className="clear" onClick={reset}>Clear all</button>
            </div>

            <div className="results">
              <span><b>{filtered.length}</b> {filtered.length === 1 ? "property" : "properties"} shown</span>
            </div>

            {loading ? (
              <div className="empty"><p>Loading properties...</p></div>
            ) : notice && properties.length === 0 ? (
              <div className="empty">
                <ShieldCheck />
                <h3>Could not load listings</h3>
                <p>{notice}</p>
                <button className="primary" onClick={loadProperties}>Try again</button>
              </div>
            ) : filtered.length ? (
              <div className="grid">
                {filtered.map((p) => (
                  <article className="card" key={p.id}>
                    <button
                      className="card-image"
                      onClick={() => setSelected(p)}
                      aria-label={`View ${p.title}`}
                    >
                      <img src={p.image} alt={p.title} loading="lazy" />
                      <span className="status">{p.status}</span>
                    </button>

                    <button
                      className={saved.includes(p.id) ? "save saved" : "save"}
                      onClick={() =>
                        setSaved((old) =>
                          old.includes(p.id)
                            ? old.filter((id) => id !== p.id)
                            : [...old, p.id]
                        )
                      }
                      aria-label="Save property"
                    >
                      <Heart size={17} fill={saved.includes(p.id) ? "currentColor" : "none"} />
                    </button>

                    <div className="card-content">
                      <div className="card-type">{p.type}</div>
                      <button className="card-title" onClick={() => setSelected(p)}>
                        {p.title}<ArrowUpRight size={16} />
                      </button>
                      <p className="location"><MapPin size={14} />{p.location}</p>
                      <div className="card-bottom">
                        <div><b>{p.priceLabel}</b><small>{p.area}</small></div>
                        <button onClick={() => setSelected(p)}>View details</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty">
                <Search />
                <h3>{properties.length ? "No properties match those filters" : "No properties listed yet"}</h3>
                <p>
                  {properties.length
                    ? "Try a different category, area or budget."
                    : "Open the admin panel to add your first property."}
                </p>
                {properties.length > 0 && (
                  <button className="primary" onClick={reset}>Reset search</button>
                )}
              </div>
            )}

            <div className="disclaimer">
              <ShieldCheck />
              <p><b>Important:</b> Please verify ownership documents, price, address and availability before making a property decision.</p>
            </div>
          </section>

          <section className="approach" id="approach">
            <div className="section approach-grid">
              <div>
                <div className="eyebrow light">A MORE THOUGHTFUL WAY TO FIND PROPERTY</div>
                <h2>Good decisions<br />start with <em>clarity.</em></h2>
                <p>Whether you're exploring a first home, a plot for the future, or a space for your business, start with the right questions and verified information.</p>
                <a className="outline" href="#contact">Talk to our team <ArrowUpRight /></a>
              </div>
              <div className="steps">
                <div><b>01</b><section><strong>Understand your needs</strong><p>Share your preferred location, budget and property type.</p></section></div>
                <div><b>02</b><section><strong>Explore suitable options</strong><p>Compare details that matter before arranging a visit.</p></section></div>
                <div><b>03</b><section><strong>Verify before deciding</strong><p>Check ownership, documents, terms and property details with appropriate professionals.</p></section></div>
              </div>
            </div>
          </section>

          <section className="about section" id="about">
            <div className="about-mark"><Building2 /><b>LOCAL KNOWLEDGE<br />PERSONAL SERVICE</b></div>
            <div>
              <div className="eyebrow">TONY MOBILE AND PROPERTY DEALERS</div>
              <h2>Property is personal.<br /><em>Your experience should be, too.</em></h2>
              <p>Discover property opportunities in Jalandhar, Punjab. Contact us for information about available listings.</p>
            </div>
          </section>

          <section className="contact" id="contact">
            <div>
              <div className="eyebrow light">LET'S START A CONVERSATION</div>
              <h2>Looking for your next property?</h2>
              <p>Share what you have in mind and take the next step.</p>
            </div>
            <a href={wa(null)} target="_blank" rel="noreferrer">
              <MessageCircle /> Enquire on WhatsApp <ArrowUpRight />
            </a>
          </section>
        </main>
      )}

      <footer className="footer">
        <a className="brand" href="#">
          <span className="brand-icon"><Building2 /></span>
          <span><b>Tony <em>Property</em></b><small>MOBILE AND PROPERTY DEALERS</small></span>
        </a>
        <div className="footer-location"><MapPin /> Jalandhar, Punjab, India</div>
        <div className="footer-note">
          © {new Date().getFullYear()} Tony Mobile And Property Dealers<br />
          Property information should be verified before purchase or rental.
        </div>
      </footer>

      <a
        className="whatsapp-float"
        href={wa(null)}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp inquiry"
      >
        <MessageCircle />
      </a>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
