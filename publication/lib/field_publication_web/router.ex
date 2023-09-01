defmodule FieldPublicationWeb.Router do
  use FieldPublicationWeb, :router

  pipeline :browser do
    plug :accepts, ["html"]
    plug :fetch_session
    plug :fetch_live_flash
    plug :put_root_layout, html: {FieldPublicationWeb.Layouts, :root}
    plug :protect_from_forgery
    plug :put_secure_browser_headers
  end

  pipeline :api do
    plug :accepts, ["json"]
  end

  scope "/", FieldPublicationWeb do
    pipe_through :browser

    live "/", ProjectLive.Index, :index
    live "/new", ProjectLive.Index, :new
    live "/:id/edit", ProjectLive.Index, :edit
    live "/:id", ProjectLive.Show, :show
    live "/:id/show/edit", ProjectLive.Show, :edit

    live "/:project_id/publication/new", PublicationLive.Management, :new
    # live "/:id/publication", PublicationLive.Show, :index
    # live "/:id/publication/id", PublicationLive.Show, :show

  end

  # Other scopes may use custom stacks.
  # scope "/api", FieldPublicationWeb do
  #   pipe_through :api
  # end

  # Enable LiveDashboard and Swoosh mailbox preview in development
  if Application.compile_env(:field_publication, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through :browser

      live_dashboard "/dashboard", metrics: FieldPublicationWeb.Telemetry
      forward "/mailbox", Plug.Swoosh.MailboxPreview
    end
  end
end
