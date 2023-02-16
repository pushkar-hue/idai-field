defmodule FieldHub.CLI do
  alias FieldHub.{
    CouchService,
    FileStore,
    Issues,
    Project,
    User
  }

  require Logger

  @moduledoc """
  Bundles functions to be called from the command line.

  While it is possible to call every function using eval, in release builds eval will not start other applications. For most of the following functions
  a running HTTPoison application (process) is expected to be running, the functions therefore make sure to start HTTPoison.

  See https://hexdocs.pm/mix/1.12/Mix.Tasks.Release.html#module-one-off-commands-eval-and-rpc.
  """

  @doc """
  Run basic setup for the whole application.
  """
  def setup() do
    HTTPoison.start()

    Logger.info("Running setup.")

    admin_user = Application.get_env(:field_hub, :couchdb_admin_name)
    app_user = Application.get_env(:field_hub, :couchdb_user_name)

    Logger.info("Running initial CouchDB setup for single node at #{CouchService.base_url()}...")
    # See https://docs.couchdb.org/en/3.2.0/setup/single-node.html

    {users, replicator} = CouchService.initial_setup()

    case users do
      %{status_code: 412} ->
        Logger.warning(
          "System database '_users' already exists. You probably ran the CouchDB setup on an existing instance."
        )

      %{status_code: code} when 199 < code and code < 300 ->
        Logger.info("Created system database `_users`.")
    end

    case replicator do
      %{status_code: 412} ->
        Logger.warning(
          "System database '_replicator' already exists. You probably ran the CouchDB setup on an existing instance."
        )

      %{status_code: code} when 199 < code and code < 300 ->
        Logger.info("Created system database `_replicator`.")
    end

    User.create(
      app_user,
      Application.get_env(:field_hub, :couchdb_user_password)
    )
    |> case do
      :created ->
        Logger.info("Created application user '#{app_user}'.")

      :already_exists ->
        Logger.warning("Application user '#{app_user}' already exists.")
    end

    admin_user
    |> Project.get_all_for_user()
    |> Enum.each(fn project_identifier ->
      Logger.info("Running setup for existing project #{project_identifier}.")

      Project.update_user(app_user, project_identifier, :member)
      |> case do
        :set ->
          Logger.info("- User '#{app_user}' is set as member of project '#{project_identifier}'.")
      end

      FileStore.create_directories(project_identifier)
      |> Enum.each(fn {variant_name, :ok} ->
        Logger.info(
          "- File directory for '#{variant_name}' is setup for project '#{project_identifier}'."
        )
      end)
    end)

    Logger.info("Setup done.")
  end

  @doc """
  Creates a new project and its default user of the same name. Generates a random password for the user.

  __Parameters__
  - `project_identifier` the project's name.
  """
  def create_project(project_identifier) do
    create_project(project_identifier, CouchService.create_password())
  end

  @doc """
  Creates a new project and its default user of the same name with the given password.

  __Parameters__
  - `project_identifier` the project's name.
  - `password` the default user's password.
  """
  def create_project(project_identifier, password) do
    HTTPoison.start()

    Logger.info("Creating project #{project_identifier}.")

    response = Project.create(project_identifier)

    case response do
      :invalid_name ->
        Logger.error("Invalid project name '#{project_identifier}'.")

      %{database: database, file_store: file_store} ->
        case database do
          :already_exists ->
            Logger.warning("Project database '#{project_identifier}' already exists.")

          :created ->
            Logger.info("Created project database '#{project_identifier}'.")
        end

        file_store
        |> Enum.map(fn result ->
          case result do
            {file_variant, :ok} ->
              Logger.info("Created directory for '#{file_variant}'.")

            {file_variant, posix} ->
              Logger.info("Unable to create directory for '#{file_variant}': #{posix}")
          end
        end)

        create_user(project_identifier, password)

        Project.update_user(project_identifier, project_identifier, :member)
        |> case do
          :set ->
            Logger.info("Set user '#{project_identifier}' as member to project '#{project_identifier}'.")
        end

        Logger.info("Project creation done.")
    end
  end

  @doc """
  Deletes a project.

  __Parameters__
  - `project_identifier` the project's name.
  """
  def delete_project(project_identifier) do
    HTTPoison.start()

    Project.delete(project_identifier)
    |> case do
      %{database: :unknown_project, file_store: _file_store} = result ->
        Logger.warning("Project database '#{project_identifier}' does not exists.")
        result

      %{database: :deleted, file_store: _file_store} = result ->
        Logger.info("Deleted project database '#{project_identifier}'.")
        result
    end
    |> case do
      %{database: _, file_store: file_store} ->
        file_store
        |> Enum.map(fn result ->
          case result do
            {:ok, file_variant} ->
              Logger.info("Deleted directory for '#{file_variant}'.")
          end
        end)
    end

    delete_user(project_identifier)
  end

  @doc """
  Creates a user with a random password.

  __Parameters__
  - `user_name` the user's name.
  """
  def create_user(user_name) do
    create_user(user_name, CouchService.create_password())
  end

  @doc """
  Creates a user with a given password.

  __Parameters__
  - `user_name` the user's name.
  - `password` the user's password.
  """
  def create_user(user_name, password) do
    HTTPoison.start()

    User.create(user_name, password)
    |> case do
      :created ->
        Logger.info("Created user '#{user_name}' with password '#{password}'.")

      :already_exists ->
        Logger.info("User '#{user_name}' already exists.")
    end
  end

  @doc """
  Deletes a user.

  __Parameters__
  - `user_name` the user's name.
  """
  def delete_user(user_name) do
    HTTPoison.start()

    User.delete(user_name)
    |> case do
      :deleted ->
        Logger.info("Deleted user '#{user_name}'.")

      :unknown ->
        Logger.warning("Unknown user '#{user_name}'.")
    end
  end

  @doc """
  Sets a new password for an existing user.

  __Parameters__
  - `user_name` the user's name.
  - `user_password` the user's password.
  """
  def set_password(user_name, user_password) do
    HTTPoison.start()

    User.update_password(user_name, user_password)
    |> case do
      :updated ->
        Logger.info("Updated password for user '#{user_name}'.")

      :unknown ->
        Logger.warning("Unknown user '#{user_name}'.")
    end
  end

  @doc """
  Sets a user as project admin.

  __Parameters__
  - `user_name` the user's name.
  - `project_identifier` the project's name.
  """
  def add_user_as_project_admin(user_name, project_identifier) do
    HTTPoison.start()

    Project.update_user(user_name, project_identifier, :admin)
    |> case do
      :set ->
        Logger.info("User '#{user_name}' has been set as admin to '#{project_identifier}'.")

      :unknown_project ->
        Logger.warning("Tried to set user '#{user_name}' to unknown project '#{project_identifier}'.")

      :unknown_user ->
        Logger.warning("Tried to set unknown user '#{user_name}' to project '#{project_identifier}'.")
    end
  end

  @doc """
  Sets a user as project member.

  __Parameters__
  - `user_name` the user's name.
  - `project_identifier` the project's name.
  """
  def add_user_as_project_member(user_name, project_identifier) do
    HTTPoison.start()

    Project.update_user(user_name, project_identifier, :member)
    |> case do
      :set ->
        Logger.info("User '#{user_name}' has been set as member to '#{project_identifier}'.")

      :unknown_project ->
        Logger.warning("Tried to set user '#{user_name}' to unknown project '#{project_identifier}'.")

      :unknown_user ->
        Logger.warning("Tried to set unknown user '#{user_name}' to project '#{project_identifier}'.")
    end
  end

  @doc """
  Removes a user from all roles within a project.

  __Parameters__
  - `user_name` the user's name.
  - `project_identifier` the project's name.
  """
  def remove_user_from_project(user_name, project_identifier) do
    HTTPoison.start()

    Project.update_user(user_name, project_identifier, :none)
    |> case do
      :unset ->
        Logger.info("User '#{user_name}' has been unset from all roles in '#{project_identifier}'.")

      :unknown_project ->
        Logger.warning(
          "Tried to unset user '#{user_name}' from unknown project '#{project_identifier}'."
        )

      :unknown_user ->
        Logger.warning(
          "Tried to unset unknown user '#{user_name}' from project '#{project_identifier}'."
        )
    end
  end

  @doc """
  Prints basic statistics (database and file system related) for all existing or a specific project.

  __Parameters__
  - `project_identifier` the project's name (optional)
  """
  def get_project_statistics() do
    Application.get_env(:field_hub, :couchdb_admin_name)
    |> Project.evaluate_all_projects_for_user()
    |> Enum.each(&print_statistics/1)
  end

  def get_project_statistics(project_identifier) do
    HTTPoison.start()

    project_identifier
    |> Project.evaluate_project()
    |> print_statistics()
  end

  @doc """
  Prints all issues for a given project.

  __Parameters__
  - `project_identifier` the project's name.
  """
  def get_project_issues(project_identifier) do
    HTTPoison.start()

    project_identifier
    |> Issues.evaluate_all()
    |> print_issues()
  end

  defp print_statistics(%{name: project_identifier, database: db, files: files}) do
    header = "######### Project '#{project_identifier}' #########"

    Logger.info(header)
    Logger.info("Database documents: #{db[:doc_count]}")
    Logger.info("Database size: #{Sizeable.filesize(db[:file_size])} (#{db[:file_size]} bytes)")

    case files do
      :enoent ->
        Logger.warning("No files directory found for '#{project_identifier}'.")

      values ->
        values
        |> Enum.each(fn {file_type, file_info} ->
          Logger.info(
            "#{get_file_type_label(file_type)} files: #{file_info[:active]}, size: #{Sizeable.filesize(file_info[:active_size])} (#{file_info[:active_size]} bytes)"
          )
        end)
    end

    Logger.info("#{String.duplicate("#", String.length(header))}\n")
  end

  def print_issues([]) do
    Logger.info("No issues found.")
  end

  def print_issues(issues) do
    issues
    |> Enum.each(fn %Issues.Issue{type: type, severity: severity, data: data} ->
      case severity do
        :info ->
          print_issue(type, data, &Logger.info/1)

        :warning ->
          print_issue(type, data, &Logger.warning/1)

        _ ->
          print_issue(type, data, &Logger.error/1)
      end
    end)
  end

  defp print_issue(type, data, logger_function) do
    case Map.values(data) do
      [] ->
        logger_function.("Issue: #{type}.")

      _vals ->
        logger_function.("Issue: #{type}:")
    end

    data
    |> Enum.each(fn {key, value} ->
      logger_function.("- #{key}: #{value}")
    end)
  end

  defp get_file_type_label(type) do
    case type do
      :original_image ->
        "Original image"

      :thumbnail_image ->
        "Thumbnail image"
    end
  end
end
